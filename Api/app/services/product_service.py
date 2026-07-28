"""Products: translations, category assignment, and the automatic default
variant every product must have (Hard Rule 5 — never a "has variants" branch).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.catalog import (
    Media,
    Product,
    ProductCategory,
    ProductMedia,
    ProductTranslation,
    Variant,
)
from app.services import audit_service, inventory_service
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


def attach_primary_image_keys(db: Session, products: list[Product]) -> None:
    """Storage key of each product's primary gallery image, for the list
    thumbnail. Primary first, then sort order — the same ordering the storefront
    card uses, so the admin thumbnail is the image shoppers actually see."""
    product_ids = [product.id for product in products]
    for product in products:
        product.primary_image_key = None
    if not product_ids:
        return

    rows = (
        db.query(ProductMedia.product_id, Media.storage_key)
        .join(Media, Media.id == ProductMedia.media_id)
        .filter(ProductMedia.product_id.in_(product_ids))
        .order_by(
            ProductMedia.product_id,
            ProductMedia.is_primary.desc(),
            ProductMedia.sort_order,
            ProductMedia.id,
        )
        .all()
    )
    first: dict[int, str] = {}
    for product_id, key in rows:
        first.setdefault(product_id, key)
    for product in products:
        product.primary_image_key = first.get(product.id)


def attach_stock_totals(db: Session, products: list[Product]) -> None:
    """Total stock across each product's active variants, plus the badge state,
    for the list page's stock column. One query for the whole page rather than
    one per row.

    The state is worst-of: a product whose variants are 40 and 0 reads as out
    of stock, because one of the things a shopper can pick genuinely is. Same
    for low — the column exists to surface exactly that.
    """
    variant_ids = [
        variant.id for product in products for variant in product.variants if variant.is_active
    ]
    quantities = inventory_service.stock_map(db, variant_ids)

    for product in products:
        active = [variant for variant in product.variants if variant.is_active]
        product.stock_quantity = sum(quantities.get(variant.id, 0) for variant in active)
        states = {
            inventory_service.stock_state(
                quantities.get(variant.id, 0),
                variant.low_stock_threshold,
                product.track_inventory,
            )
            for variant in active
        }
        product.stock_state = (
            "out_of_stock" if "out_of_stock" in states
            else "low_stock" if "low_stock" in states
            else "in_stock"
        )


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
        track_inventory=data.track_inventory,
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
    attach_stock_totals(db, [product])
    return _set_derived_fields(product)


def update_product(db: Session, product_id: int, data, actor_user_id: int | None) -> Product:
    product = _load(db, product_id)

    proposed = {}
    if "brand_id" in data.model_fields_set:
        proposed["brand_id"] = data.brand_id
    for field in (
        "product_type",
        "base_price",
        "tax_class",
        "is_featured",
        "is_best_seller",
        "track_inventory",
    ):
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


def set_product_stock(db: Session, product_id: int, items, actor_user_id: int | None) -> Product:
    """Apply the product form's stock column in one transaction.

    Editing these numbers here is the only way an admin changes stock — there
    is no adjustment modal and no separate stock screen in this flow. Each
    quantity still lands as a movement through inventory_service, so the ledger
    stays complete and Hard Rule 2 holds.
    """
    product = _load(db, product_id)
    owned = {variant.id for variant in product.variants}

    foreign = [item.variant_id for item in items if item.variant_id not in owned]
    if foreign:
        raise BusinessRuleError(
            "Those variants do not belong to this product.",
            code="variant_not_on_product",
            details={"variant_ids": foreign},
        )

    # Ascending variant_id for the same deadlock reason checkout sorts its
    # lines (Hard Rule 3) — two admins saving overlapping products would
    # otherwise be able to lock the same rows in opposite orders.
    for item in sorted(items, key=lambda i: i.variant_id):
        inventory_service.set_stock(db, item.variant_id, item.stock_quantity, actor_user_id)

    db.commit()
    db.refresh(product)
    product.category_ids = get_product_category_ids(db, product.id)
    attach_stock_totals(db, [product])
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
