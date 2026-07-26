"""stock_levels.on_hand is only ever written here, always alongside a
stock_movements row in the same transaction (Hard Rule 2). Decrements lock
rows via SELECT ... FOR UPDATE, variant_id ascending, to avoid deadlocks
between concurrent transactions touching overlapping variant sets
(Hard Rule 3) — callers that touch multiple variants must pass them in that
order; single-variant callers get it for free.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.inventory import (
    Location,
    StockCount,
    StockCountItem,
    StockLevel,
    StockMovement,
    StockTransfer,
    StockTransferItem,
)
from app.services import audit_service


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


def get_stock_levels(db: Session, variant_id: int) -> list[StockLevel]:
    stmt = select(StockLevel).where(StockLevel.variant_id == variant_id)
    levels = list(db.execute(stmt).scalars().all())
    for level in levels:
        level.available = level.on_hand - level.reserved
    return levels


def adjust_stock(db: Session, data, actor_user_id: int) -> StockMovement:
    movement = _apply_movement(
        db,
        variant_id=data.variant_id,
        location_id=data.location_id,
        qty_delta=data.qty_delta,
        reason="adjustment",
        ref_type=None,
        ref_id=None,
        actor_user_id=actor_user_id,
        note=data.note,
    )
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="stock.adjust",
        entity_type="stock_level",
        entity_id=None,
        before=None,
        after={
            "variant_id": data.variant_id,
            "location_id": data.location_id,
            "qty_delta": data.qty_delta,
            "note": data.note,
        },
    )
    db.commit()
    db.refresh(movement)
    return movement


# --------------------------------------------------------------------------
# Transfers
# --------------------------------------------------------------------------

def create_transfer(db: Session, data, actor_user_id: int) -> StockTransfer:
    if data.from_location_id == data.to_location_id:
        raise BusinessRuleError("Source and destination locations must differ.")

    transfer_number = f"TRF-{datetime.now(timezone.utc):%Y}-{int(datetime.now(timezone.utc).timestamp()) % 100000:05d}"
    transfer = StockTransfer(
        transfer_number=transfer_number,
        from_location_id=data.from_location_id,
        to_location_id=data.to_location_id,
        status="draft",
        created_by_user_id=actor_user_id,
        note=data.note,
    )
    db.add(transfer)
    db.flush()
    for item in data.items:
        db.add(
            StockTransferItem(
                transfer_id=transfer.id,
                variant_id=item.variant_id,
                qty_requested=item.qty_requested,
                qty_dispatched=0,
                qty_received=0,
            )
        )
    db.commit()
    db.refresh(transfer)
    return get_transfer(db, transfer.id)


def get_transfer(db: Session, transfer_id: int) -> StockTransfer:
    transfer = db.get(StockTransfer, transfer_id, options=[selectinload(StockTransfer.items)])
    if transfer is None:
        raise NotFoundError("Transfer not found")
    return transfer


def dispatch_transfer(db: Session, transfer_id: int, dispatch_overrides: dict[int, int], actor_user_id: int) -> StockTransfer:
    transfer = get_transfer(db, transfer_id)
    if transfer.status != "draft":
        raise BusinessRuleError(f"Cannot dispatch a transfer in status '{transfer.status}'.")

    for item in sorted(transfer.items, key=lambda i: i.variant_id):
        qty = dispatch_overrides.get(item.id, item.qty_requested)
        item.qty_dispatched = qty
        _apply_movement(
            db,
            variant_id=item.variant_id,
            location_id=transfer.from_location_id,
            qty_delta=-qty,
            reason="transfer_out",
            ref_type="transfer",
            ref_id=transfer.id,
            actor_user_id=actor_user_id,
        )

    transfer.status = "dispatched"
    transfer.dispatched_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(transfer)
    return get_transfer(db, transfer.id)


def receive_transfer(db: Session, transfer_id: int, received: dict[int, int], actor_user_id: int) -> StockTransfer:
    transfer = get_transfer(db, transfer_id)
    if transfer.status != "dispatched":
        raise BusinessRuleError(f"Cannot receive a transfer in status '{transfer.status}'.")

    items_by_id = {item.id: item for item in transfer.items}
    for item_id, qty in received.items():
        item = items_by_id.get(item_id)
        if item is None:
            raise NotFoundError(f"Transfer item {item_id} not found on this transfer")
        item.qty_received += qty

    for item in sorted(transfer.items, key=lambda i: i.variant_id):
        qty = received.get(item.id, 0)
        if qty == 0:
            continue
        _apply_movement(
            db,
            variant_id=item.variant_id,
            location_id=transfer.to_location_id,
            qty_delta=qty,
            reason="transfer_in",
            ref_type="transfer",
            ref_id=transfer.id,
            actor_user_id=actor_user_id,
        )

    if all(item.qty_received >= item.qty_dispatched for item in transfer.items):
        transfer.status = "received"
        transfer.received_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(transfer)
    return get_transfer(db, transfer.id)


# --------------------------------------------------------------------------
# Stock counts
# --------------------------------------------------------------------------

def create_stock_count(db: Session, data, actor_user_id: int) -> StockCount:
    count_number = f"CNT-{datetime.now(timezone.utc):%Y}-{int(datetime.now(timezone.utc).timestamp()) % 100000:05d}"
    stock_count = StockCount(
        count_number=count_number,
        location_id=data.location_id,
        scope=data.scope,
        scope_filter=data.scope_filter,
        status="open",
        started_by_user_id=actor_user_id,
        started_at=datetime.now(timezone.utc),
    )
    db.add(stock_count)
    db.flush()

    for variant_id in data.variant_ids:
        level = db.execute(
            select(StockLevel).where(StockLevel.variant_id == variant_id, StockLevel.location_id == data.location_id)
        ).scalar_one_or_none()
        system_qty = level.on_hand if level is not None else 0
        db.add(StockCountItem(stock_count_id=stock_count.id, variant_id=variant_id, system_qty=system_qty))

    stock_count.status = "counting"
    db.commit()
    db.refresh(stock_count)
    return get_stock_count(db, stock_count.id)


def get_stock_count(db: Session, count_id: int) -> StockCount:
    stock_count = db.get(StockCount, count_id, options=[selectinload(StockCount.items)])
    if stock_count is None:
        raise NotFoundError("Stock count not found")
    return stock_count


def record_count(db: Session, count_id: int, recorded: dict[int, int], actor_user_id: int) -> StockCount:
    stock_count = get_stock_count(db, count_id)
    if stock_count.status not in ("counting", "review"):
        raise BusinessRuleError(f"Cannot record counts on a stock count in status '{stock_count.status}'.")

    items_by_id = {item.id: item for item in stock_count.items}
    for item_id, counted_qty in recorded.items():
        item = items_by_id.get(item_id)
        if item is None:
            raise NotFoundError(f"Stock count item {item_id} not found on this count")
        item.counted_qty = counted_qty
        item.counted_by_user_id = actor_user_id
        item.counted_at = datetime.now(timezone.utc)

    stock_count.status = "review"
    db.commit()
    db.refresh(stock_count)
    return get_stock_count(db, stock_count.id)


def apply_stock_count(db: Session, count_id: int, actor_user_id: int) -> StockCount:
    stock_count = get_stock_count(db, count_id)
    if stock_count.status != "review":
        raise BusinessRuleError(f"Cannot apply a stock count in status '{stock_count.status}'.")
    if stock_count.started_by_user_id == actor_user_id:
        raise BusinessRuleError(
            "Applying a stock count requires a second person — the approver cannot be the same "
            "user who started the count.",
            code="second_approver_required",
        )
    if any(item.counted_qty is None for item in stock_count.items):
        raise BusinessRuleError("All items must be counted before applying.")

    for item in sorted(stock_count.items, key=lambda i: i.variant_id):
        variance = item.counted_qty - item.system_qty
        if variance == 0:
            continue
        _apply_movement(
            db,
            variant_id=item.variant_id,
            location_id=stock_count.location_id,
            qty_delta=variance,
            reason="count_correction",
            ref_type="stock_count",
            ref_id=stock_count.id,
            actor_user_id=actor_user_id,
        )

    stock_count.status = "applied"
    stock_count.approved_by_user_id = actor_user_id
    stock_count.applied_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(stock_count)
    return get_stock_count(db, stock_count.id)
