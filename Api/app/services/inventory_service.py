"""stock_levels.on_hand is only ever written here, always alongside a
stock_movements row in the same transaction (Hard Rule 2). Decrements lock
rows via SELECT ... FOR UPDATE, variant_id ascending, to avoid deadlocks
between concurrent transactions touching overlapping variant sets
(Hard Rule 3) — callers that touch multiple variants must pass them in that
order; single-variant callers get it for free.

The bottom half of this module is the *simple* stock surface: one quantity
number per variant, which the admin product form edits and checkout decrements.
That number is deliberately not a second column competing with the ledger — it
is on_hand at the single default online-sellable location.

Manual multi-location stock work — per-location adjustments, transfers between
locations, and stock counts — used to live here too and has been removed: the
product form is the only way stock changes by hand now. The ledger primitives
below stay, because goods receipts and returns still move stock, and because
re-introducing that flow must not mean re-inventing how on_hand is written.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, ConflictError, NotFoundError
from app.models.catalog import Product, ProductTranslation, Variant
from app.models.inventory import Location, StockLevel, StockMovement


# --------------------------------------------------------------------------
# Locations
# --------------------------------------------------------------------------

def create_location(db: Session, data) -> Location:
    location = Location(**data.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


def get_location(db: Session, location_id: int) -> Location:
    location = db.get(Location, location_id)
    if location is None:
        raise NotFoundError("Location not found")
    return location


def update_location(db: Session, location_id: int, data) -> Location:
    location = get_location(db, location_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(location, field, value)
    db.commit()
    db.refresh(location)
    return location


# --------------------------------------------------------------------------
# Stock levels & movements — the only place that writes stock_levels.on_hand
# --------------------------------------------------------------------------

def _get_or_create_locked(db: Session, variant_id: int, location_id: int) -> StockLevel:
    stmt = (
        select(StockLevel)
        .where(StockLevel.variant_id == variant_id, StockLevel.location_id == location_id)
        .with_for_update()
    )
    level = db.execute(stmt).scalar_one_or_none()
    if level is not None:
        return level

    level = StockLevel(
        variant_id=variant_id,
        location_id=location_id,
        on_hand=0,
        reserved=0,
        incoming=0,
        safety_stock=0,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(level)
    db.flush()
    return db.execute(stmt).scalar_one()


def _apply_movement(
    db: Session,
    *,
    variant_id: int,
    location_id: int,
    qty_delta: int,
    reason: str,
    ref_type: str | None,
    ref_id: int | None,
    unit_cost=None,
    actor_user_id: int | None,
    note: str | None = None,
) -> StockMovement:
    level = _get_or_create_locked(db, variant_id, location_id)
    new_on_hand = level.on_hand + qty_delta
    if new_on_hand < 0:
        raise BusinessRuleError(
            f"Insufficient stock at this location: {level.on_hand} on hand, requested change {qty_delta}.",
            code="insufficient_stock",
        )
    level.on_hand = new_on_hand
    level.updated_at = datetime.now(timezone.utc)

    movement = StockMovement(
        variant_id=variant_id,
        location_id=location_id,
        qty_delta=qty_delta,
        reason=reason,
        ref_type=ref_type,
        ref_id=ref_id,
        unit_cost=unit_cost,
        balance_after=new_on_hand,
        actor_user_id=actor_user_id,
        note=note,
    )
    db.add(movement)
    db.flush()
    return movement


def receive_stock(
    db: Session,
    *,
    variant_id: int,
    location_id: int,
    qty: int,
    unit_cost=None,
    ref_type: str | None,
    ref_id: int | None,
    actor_user_id: int | None,
) -> StockMovement:
    """Public entry point for goods-receipt style positive movements.
    Other services (e.g. purchasing_service) must call this — never the
    private _apply_movement — so stock_levels stays written from one place."""
    return _apply_movement(
        db,
        variant_id=variant_id,
        location_id=location_id,
        qty_delta=qty,
        reason="receipt",
        ref_type=ref_type,
        ref_id=ref_id,
        unit_cost=unit_cost,
        actor_user_id=actor_user_id,
    )


def restock_from_return(
    db: Session, *, variant_id: int, location_id: int, qty: int, ref_id: int | None, actor_user_id: int | None
) -> StockMovement:
    """Public entry point for return-driven positive movements (return_items.restock)."""
    return _apply_movement(
        db,
        variant_id=variant_id,
        location_id=location_id,
        qty_delta=qty,
        reason="return",
        ref_type="return",
        ref_id=ref_id,
        actor_user_id=actor_user_id,
    )


# --------------------------------------------------------------------------
# Simple stock: one number per variant
# --------------------------------------------------------------------------
# Everything below treats stock as a single integer per variant so the admin
# product form and the storefront can speak about it plainly. Storage is still
# stock_levels + stock_movements; the simplification is that this surface only
# ever reads and writes ONE location — the default online-sellable one.
# Reading a sum across locations while writing to a single one would let the
# storefront advertise 10 when checkout could only ever take 5 from the row it
# decrements, so read and write deliberately share the same target.

DEFAULT_ONLINE_LOCATION_CODE = "ONLINE"


def default_online_location_id(db: Session) -> int | None:
    """The one location the simple stock surface reads and writes.

    Lowest fulfilment_priority wins, then lowest id, so the choice is stable
    rather than dependent on row order. Returns None when no online-sellable
    location exists — read paths treat that as everything being 0 instead of
    raising, because a fresh install has no locations at all.
    """
    return db.execute(
        select(Location.id)
        .where(Location.is_active.is_(True), Location.is_sellable_online.is_(True))
        .order_by(Location.fulfilment_priority, Location.id)
        .limit(1)
    ).scalar_one_or_none()


def ensure_default_online_location(db: Session) -> int:
    """Write-path counterpart: this surface has to have somewhere to put a
    number, so the first admin who types a stock quantity into the product form
    provisions the default location rather than being sent to a module they
    were never meant to see. Flushed, not committed — the caller owns the
    transaction."""
    location_id = default_online_location_id(db)
    if location_id is not None:
        return location_id

    location = Location(
        code=DEFAULT_ONLINE_LOCATION_CODE,
        type="warehouse",
        name_ar="المستودع الرئيسي",
        name_en="Main warehouse",
        is_sellable_online=True,
        fulfilment_priority=0,
        is_active=True,
    )
    db.add(location)
    db.flush()
    return location.id


def stock_map(db: Session, variant_ids: list[int]) -> dict[int, int]:
    """{variant_id: quantity} at the default online location, 0 where there is
    no level row. Always returns an entry for every id asked for, so callers
    never have to tell "no row" apart from "none in stock"."""
    quantities = {variant_id: 0 for variant_id in variant_ids}
    location_id = default_online_location_id(db)
    if location_id is None or not variant_ids:
        return quantities

    rows = db.execute(
        select(StockLevel.variant_id, StockLevel.on_hand).where(
            StockLevel.variant_id.in_(variant_ids), StockLevel.location_id == location_id
        )
    ).all()
    for variant_id, on_hand in rows:
        quantities[variant_id] = max(on_hand, 0)
    return quantities


def stock_for_variant(db: Session, variant_id: int) -> int:
    return stock_map(db, [variant_id])[variant_id]


def set_stock(db: Session, variant_id: int, quantity: int, actor_user_id: int | None) -> int:
    """Set a variant to an absolute quantity — what the admin does by typing in
    the product form, which is the only way stock changes by hand.

    Recorded as a movement for the delta so the ledger stays complete; setting
    the same number again is a no-op rather than a zero-delta entry. Does not
    commit: a product save batches several of these into one transaction.
    """
    if quantity < 0:
        raise BusinessRuleError(
            f"Stock quantity cannot be negative (got {quantity}).",
            code="invalid_stock_quantity",
        )

    location_id = ensure_default_online_location(db)
    level = _get_or_create_locked(db, variant_id, location_id)
    delta = quantity - level.on_hand
    if delta == 0:
        return quantity

    _apply_movement(
        db,
        variant_id=variant_id,
        location_id=location_id,
        qty_delta=delta,
        reason="adjustment",
        ref_type="product_form",
        ref_id=None,
        actor_user_id=actor_user_id,
        note="Set from the product form",
    )
    return quantity


def _tracking_map(db: Session, variant_ids: list[int]) -> dict[int, bool]:
    """{variant_id: product.track_inventory}. Unknown variants default to
    tracked — refusing to sell is the safe side of a lookup miss."""
    if not variant_ids:
        return {}
    rows = db.execute(
        select(Variant.id, Product.track_inventory)
        .join(Product, Product.id == Variant.product_id)
        .where(Variant.id.in_(variant_ids))
    ).all()
    return {variant_id: bool(tracks) for variant_id, tracks in rows}


def _variant_label(db: Session, variant_id: int, locale: str = "ar") -> str:
    """Product name for the "only N left" message, falling back to the bare SKU
    so the 409 always names something the shopper recognises."""
    row = db.execute(
        select(Variant.sku, ProductTranslation.name)
        .join(Product, Product.id == Variant.product_id)
        .join(
            ProductTranslation,
            (ProductTranslation.product_id == Product.id)
            & (ProductTranslation.locale == locale),
            isouter=True,
        )
        .where(Variant.id == variant_id)
    ).first()
    if row is None:
        return f"Variant {variant_id}"
    sku, name = row
    return name or sku


def decrement_for_order(
    db: Session,
    *,
    lines: list[tuple[int, int]],
    order_id: int | None,
    locale: str = "ar",
) -> None:
    """Take stock for an order. `lines` is [(variant_id, qty)].

    Never reads-then-writes: the guard lives in the UPDATE's WHERE clause, so
    two transactions racing for the last unit cannot both pass it. The second
    blocks on the first's row lock, then re-evaluates on_hand >= qty against
    the committed value and matches zero rows.

    Rows are locked in ascending variant_id order (Hard Rule 3) by issuing one
    statement per variant in that order, so two multi-item orders sharing
    variants cannot deadlock against each other.

    Raises ConflictError(code="insufficient_stock") on the first line that
    cannot be satisfied, leaving the caller's transaction dirty on purpose: it
    must roll back, which is what makes the order atomic — no partial
    decrement from an earlier line survives a later line failing.
    """
    if not lines:
        return

    location_id = ensure_default_online_location(db)

    # Merge duplicate variant ids before sorting: the same variant arriving as
    # two cart lines must be checked against its combined quantity, not twice
    # against the same balance.
    merged: dict[int, int] = {}
    for variant_id, qty in lines:
        merged[variant_id] = merged.get(variant_id, 0) + qty

    tracked = _tracking_map(db, list(merged))

    for variant_id in sorted(merged):
        qty = merged[variant_id]
        if qty <= 0:
            continue
        if not tracked.get(variant_id, True):
            # track_inventory = false: always purchasable, and the number is
            # left exactly as it was rather than driven negative.
            continue

        remaining = db.execute(
            update(StockLevel)
            .where(
                StockLevel.variant_id == variant_id,
                StockLevel.location_id == location_id,
                StockLevel.on_hand >= qty,
            )
            .values(on_hand=StockLevel.on_hand - qty, updated_at=datetime.now(timezone.utc))
            .returning(StockLevel.on_hand)
        ).scalar_one_or_none()

        if remaining is None:
            # Zero rows matched: either not enough on hand, or no level row at
            # all. Both mean the same thing to a shopper, and the balance is
            # read back here only to put a real number in the error.
            available = stock_for_variant(db, variant_id)
            name = _variant_label(db, variant_id, locale)
            raise ConflictError(
                f"Only {available} left of {name}.",
                code="insufficient_stock",
                details={
                    "variant_id": variant_id,
                    "variant_name": name,
                    "requested": qty,
                    "available": available,
                },
            )

        db.add(
            StockMovement(
                variant_id=variant_id,
                location_id=location_id,
                qty_delta=-qty,
                reason="sale",
                ref_type="order",
                ref_id=order_id,
                balance_after=remaining,
                actor_user_id=None,
            )
        )
    db.flush()


def restore_for_order(db: Session, *, lines: list[tuple[int, int]], order_id: int) -> None:
    """Put an order's stock back.

    Idempotency is the caller's job — it must have already checked and stamped
    orders.stock_restored_at inside this same transaction. Untracked variants
    are skipped so their number stays untouched on the way back too.
    """
    if not lines:
        return

    location_id = ensure_default_online_location(db)

    merged: dict[int, int] = {}
    for variant_id, qty in lines:
        merged[variant_id] = merged.get(variant_id, 0) + qty

    tracked = _tracking_map(db, list(merged))

    for variant_id in sorted(merged):
        qty = merged[variant_id]
        if qty <= 0 or not tracked.get(variant_id, True):
            continue
        _apply_movement(
            db,
            variant_id=variant_id,
            location_id=location_id,
            qty_delta=qty,
            reason="cancellation",
            ref_type="order",
            ref_id=order_id,
            actor_user_id=None,
        )
    db.flush()


def stock_state(quantity: int, threshold: int | None, tracked: bool = True) -> str:
    """in_stock | low_stock | out_of_stock, shared by the admin badge and the
    storefront so a single rule decides what "low" means."""
    if not tracked:
        return "in_stock"
    if quantity <= 0:
        return "out_of_stock"
    if threshold is not None and quantity <= threshold:
        return "low_stock"
    return "in_stock"
