"""Variants: manual field edits, price edits (always audited), and explicit
combination generation with the 300-variant cap (Hard Rule 6 — never a full
cartesian product; the caller sends exactly the combinations to create).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.catalog import Product, Variant, VariantOptionValue
from app.services import audit_service, inventory_service

MAX_VARIANTS_PER_PRODUCT = 300


def attach_stock(db: Session, variants: list[Variant]) -> None:
    """Hang the one stock number off each variant for serialisation. It is not
    a column — see inventory_service's simple-stock section for why the number
    lives at the default online location instead."""
    quantities = inventory_service.stock_map(db, [variant.id for variant in variants])
    for variant in variants:
        variant.stock_quantity = quantities.get(variant.id, 0)


def get_variant_option_value_ids(db: Session, variant_id: int) -> list[int]:
    rows = db.query(VariantOptionValue.option_value_id).filter(VariantOptionValue.variant_id == variant_id).all()
    return [r[0] for r in rows]


def get_variant(db: Session, variant_id: int) -> Variant:
    variant = db.get(Variant, variant_id)
    if variant is None:
        raise NotFoundError("Variant not found")
    variant.option_value_ids = get_variant_option_value_ids(db, variant_id)
    attach_stock(db, [variant])
    return variant


def list_variants(db: Session, product_id: int) -> list[Variant]:
    variants = list(db.execute(select(Variant).where(Variant.product_id == product_id).order_by(Variant.position)).scalars().all())
    for v in variants:
        v.option_value_ids = get_variant_option_value_ids(db, v.id)
    attach_stock(db, variants)
    return variants


def update_variant(db: Session, variant_id: int, data, actor_user_id: int | None = None) -> Variant:
    variant = db.get(Variant, variant_id)
    if variant is None:
        raise NotFoundError("Variant not found")
    for field in ("barcode", "weight_grams", "low_stock_threshold"):
        if field in data.model_fields_set:
            setattr(variant, field, getattr(data, field))
    for field in ("position", "is_active"):
        if field in data.model_fields_set and (value := getattr(data, field)) is not None:
            setattr(variant, field, value)
    # Stock rides along on the same save so editing one variant row in the
    # product form is a single request, and lands as a movement rather than a
    # direct write (Hard Rule 2).
    if data.stock_quantity is not None:
        inventory_service.set_stock(db, variant_id, data.stock_quantity, actor_user_id)
    db.commit()
    db.refresh(variant)
    variant.option_value_ids = get_variant_option_value_ids(db, variant_id)
    attach_stock(db, [variant])
    return variant


def update_variant_price(db: Session, variant_id: int, data, actor_user_id: int | None) -> Variant:
    variant = db.get(Variant, variant_id)
    if variant is None:
        raise NotFoundError("Variant not found")

    proposed = {
        field: getattr(data, field)
        for field in ("price", "compare_at_price", "cost_price")
        if field in data.model_fields_set
    }
    product = db.get(Product, variant.product_id)
    effective_price = proposed.get("price", variant.price)
    if effective_price is None:
        effective_price = product.base_price
    compare_at = proposed.get("compare_at_price", variant.compare_at_price)
    if compare_at is not None and Decimal(compare_at) <= Decimal(effective_price):
        raise BusinessRuleError(
            "Compare-at price must be greater than the selling price.",
            code="invalid_compare_at_price",
        )
    before, after = audit_service.diff_changed_fields(variant, proposed)
    for field, value in proposed.items():
        setattr(variant, field, value)
    if before:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="variant.price_update",
            entity_type="variant",
            entity_id=variant.id,
            before=before,
            after=after,
        )
    db.commit()
    db.refresh(variant)
    variant.option_value_ids = get_variant_option_value_ids(db, variant_id)
    attach_stock(db, [variant])
    return variant


def deactivate_variant(db: Session, variant_id: int) -> None:
    variant = db.get(Variant, variant_id)
    if variant is None:
        raise NotFoundError("Variant not found")
    variant.is_active = False
    variant.discontinued_at = datetime.now(timezone.utc)
    db.commit()


def generate_variants(db: Session, product_id: int, combinations: list) -> list[Variant]:
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundError("Product not found")

    # Only active variants count toward the cap/dedup — a retired placeholder
    # or a manually deactivated variant should neither block a rerun nor
    # inflate the count.
    active_variants = list(
        db.execute(select(Variant).where(Variant.product_id == product_id, Variant.is_active.is_(True))).scalars().all()
    )

    # The auto-created default variant (Hard Rule 5) has no option values of
    # its own — once real combinations exist it's redundant, so it's retired
    # rather than left dangling as a phantom "no options" variant. There is
    # at most one such row among the active variants at any time.
    placeholder = None
    real_existing = []
    for v in active_variants:
        if placeholder is None and not get_variant_option_value_ids(db, v.id):
            placeholder = v
        else:
            real_existing.append(v)

    existing_combo_keys = {tuple(sorted(get_variant_option_value_ids(db, v.id))) for v in real_existing}

    new_combos = []
    seen_in_request = set()
    for combo in combinations:
        key = tuple(sorted(combo.option_value_ids))
        if key in existing_combo_keys or key in seen_in_request:
            continue  # skip duplicates silently; the client re-POSTing an existing combo is not an error
        seen_in_request.add(key)
        new_combos.append(combo)

    total_after = len(real_existing) + len(new_combos)
    if total_after > MAX_VARIANTS_PER_PRODUCT:
        raise BusinessRuleError(
            f"This would create {total_after} variants for one product, exceeding the {MAX_VARIANTS_PER_PRODUCT} cap.",
            code="variant_limit_exceeded",
            details={"existing": len(real_existing), "requested": len(new_combos), "limit": MAX_VARIANTS_PER_PRODUCT},
        )

    if not new_combos:
        for v in real_existing:
            v.option_value_ids = get_variant_option_value_ids(db, v.id)
        attach_stock(db, real_existing)
        return real_existing

    if placeholder is not None:
        placeholder.is_active = False
        placeholder.discontinued_at = datetime.now(timezone.utc)

    next_position = len(real_existing)
    created: list[Variant] = []
    for combo in new_combos:
        effective_price = combo.price if combo.price is not None else product.base_price
        if combo.compare_at_price is not None and Decimal(combo.compare_at_price) <= Decimal(effective_price):
            raise BusinessRuleError(
                "Compare-at price must be greater than the selling price.",
                code="invalid_compare_at_price",
            )
        sku = combo.sku or f"P{product_id}-{'-'.join(str(i) for i in sorted(combo.option_value_ids))}"
        variant = Variant(
            product_id=product_id,
            sku=sku,
            barcode=combo.barcode,
            price=combo.price,
            compare_at_price=combo.compare_at_price,
            cost_price=combo.cost_price,
            weight_grams=combo.weight_grams,
            position=next_position,
            is_active=True,
        )
        db.add(variant)
        db.flush()
        for option_value_id in combo.option_value_ids:
            db.add(VariantOptionValue(variant_id=variant.id, option_value_id=option_value_id))
        created.append(variant)
        next_position += 1

    if placeholder is not None and created:
        product.default_variant_id = created[0].id

    db.commit()
    for v in created:
        db.refresh(v)
        v.option_value_ids = get_variant_option_value_ids(db, v.id)
    for v in real_existing:
        v.option_value_ids = get_variant_option_value_ids(db, v.id)
    result = real_existing + created
    attach_stock(db, result)
    return result
