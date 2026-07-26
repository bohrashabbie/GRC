"""Products: translations, category assignment, and the automatic default
variant every product must have (Hard Rule 5 — never a "has variants" branch).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.catalog import Product, ProductCategory, ProductTranslation, Variant
from app.services import audit_service
from app.utils import slugify


def is_product_on_offer(product: Product) -> bool:
    """An offer is price data, not a second editorial flag that can drift."""
    base_price = Decimal(product.base_price)
    return any(
        variant.is_active
        and variant.compare_at_price is not None
        and Decimal(variant.compare_at_price)
        > Decimal(variant.price if variant.price is not None else base_price)
        for variant in product.variants
    )


def _set_derived_fields(product: Product) -> Product:
    product.is_on_offer = is_product_on_offer(product)
    return product


def _sync_product_translations(db: Session, existing: list[ProductTranslation], translations_in, product_id: int) -> None:
    existing_by_locale = {t.locale: t for t in existing}
    seen = set()
    for t_in in translations_in:
        seen.add(t_in.locale)
        slug = t_in.slug or slugify(t_in.name, t_in.locale)
        if t_in.locale in existing_by_locale:
            row = existing_by_locale[t_in.locale]
            row.name = t_in.name
            row.slug = slug
            row.short_description = t_in.short_description
            row.description = t_in.description
            row.meta_title = t_in.meta_title
            row.meta_description = t_in.meta_description
        else:
            db.add(
                ProductTranslation(
                    product_id=product_id,
                    locale=t_in.locale,
                    name=t_in.name,
                    slug=slug,
                    short_description=t_in.short_description,
                    description=t_in.description,
                    meta_title=t_in.meta_title,
                    meta_description=t_in.meta_description,
                )
            )
    for locale, row in existing_by_locale.items():
        if locale not in seen:
            db.delete(row)


def _sync_categories(db: Session, product_id: int, category_ids: list[int]) -> None:
    existing = {pc.category_id: pc for pc in db.query(ProductCategory).filter(ProductCategory.product_id == product_id)}
    seen = set()
    for i, category_id in enumerate(category_ids):
        seen.add(category_id)
        if category_id not in existing:
            existing[category_id] = ProductCategory(product_id=product_id, category_id=category_id)
            db.add(existing[category_id])
        existing[category_id].is_primary = i == 0
        existing[category_id].sort_order = i
    for category_id, row in existing.items():
        if category_id not in seen:
            db.delete(row)


def get_product_category_ids(db: Session, product_id: int) -> list[int]:
    rows = db.query(ProductCategory.category_id).filter(ProductCategory.product_id == product_id).order_by(ProductCategory.sort_order).all()
    return [r[0] for r in rows]


def create_product(db: Session, data, actor_user_id: int | None) -> Product:
    product = Product(
        brand_id=data.brand_id,
        product_type=data.product_type,
        status="draft",
        base_price=data.base_price,
        tax_class=data.tax_class,
        is_featured=data.is_featured,
        is_best_seller=data.is_best_seller,
        rating_count=0,
    )
    db.add(product)
    db.flush()

    _sync_product_translations(db, [], data.translations, product.id)
    _sync_categories(db, product.id, data.category_ids)

    # Every product must have at least one variant — never a "has variants"
    # branch. Simple products get this default variant automatically; it's
    # what generate_variants() replaces if real option combinations are
    # created later.
    default_variant = Variant(
        product_id=product.id,
        sku=f"P{product.id}-DEFAULT",
        position=0,
        is_active=True,
    )
    db.add(default_variant)
    db.flush()
    product.default_variant_id = default_variant.id

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="product.create",
        entity_type="product",
        entity_id=product.id,
        after={"base_price": str(product.base_price), "product_type": product.product_type},
    )
    db.commit()
    db.refresh(product)
    product.category_ids = data.category_ids
    return _set_derived_fields(product)


def _load(db: Session, product_id: int) -> Product:
    product = db.get(
        Product,
        product_id,
        options=[selectinload(Product.translations), selectinload(Product.variants)],
    )
    if product is None:
        raise NotFoundError("Product not found")
    return product


def get_product(db: Session, product_id: int) -> Product:
    product = _load(db, product_id)
    product.category_ids = get_product_category_ids(db, product_id)
    return _set_derived_fields(product)


def update_product(db: Session, product_id: int, data, actor_user_id: int | None) -> Product:
    product = _load(db, product_id)

    proposed = {}
    if "brand_id" in data.model_fields_set:
        proposed["brand_id"] = data.brand_id
    for field in ("product_type", "base_price", "tax_class", "is_featured", "is_best_seller"):
        if field in data.model_fields_set and (value := getattr(data, field)) is not None:
            proposed[field] = value
    before, after = audit_service.diff_changed_fields(product, proposed)
    if "base_price" in proposed:
        new_base_price = Decimal(proposed["base_price"])
        invalid = next(
            (
                variant
                for variant in product.variants
                if variant.is_active
                and variant.price is None
                and variant.compare_at_price is not None
                and Decimal(variant.compare_at_price) <= new_base_price
            ),
            None,
        )
        if invalid is not None:
            raise BusinessRuleError(
                f"Base price must remain below compare-at price for variant {invalid.sku}.",
                code="invalid_compare_at_price",
            )
    for field, value in proposed.items():
        setattr(product, field, value)
    if before:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="product.update",
            entity_type="product",
            entity_id=product.id,
            before=before,
            after=after,
        )

    if data.translations is not None:
        _sync_product_translations(db, list(product.translations), data.translations, product.id)
    if data.category_ids is not None:
        _sync_categories(db, product.id, data.category_ids)

    db.commit()
    db.refresh(product)
    product.category_ids = get_product_category_ids(db, product.id)
    return _set_derived_fields(product)


def update_product_status(db: Session, product_id: int, new_status: str, actor_user_id: int | None) -> Product:
    product = _load(db, product_id)
    before_status = product.status
    product.status = new_status
    if new_status == "active" and product.published_at is None:
        product.published_at = datetime.now(timezone.utc)

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="product.status_change",
        entity_type="product",
        entity_id=product.id,
        before={"status": before_status},
        after={"status": new_status},
    )
    db.commit()
    db.refresh(product)
    product.category_ids = get_product_category_ids(db, product.id)
    return _set_derived_fields(product)
