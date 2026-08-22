"""Suppliers, purchase orders, and goods receipts. Receiving goods writes
stock through inventory_service — never touches stock_levels directly.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.purchasing import (
    GoodsReceipt,
    GoodsReceiptItem,
    PurchaseOrder,
    PurchaseOrderItem,
    Supplier,
)
from app.models.inventory import Location
from app.services import audit_service, deletion, inventory_service
from app.utils import paginate, slugify, unique_code


def _sequence_number(prefix: str) -> str:
    now = datetime.now(timezone.utc)
    return f"{prefix}-{now:%Y}-{int(now.timestamp()) % 100000:05d}"


# --------------------------------------------------------------------------
# Suppliers
# --------------------------------------------------------------------------

def _auto_supplier_code(db: Session, name: str) -> str:
    """Derive a code for a supplier the admin did not name one for.

    Codes are not something the business has — staff name a supplier and
    nothing else — but suppliers.code is NOT NULL and unique, so one still has
    to exist. It is a slug of the name, with a neutral stem for a name that
    slugs to nothing and a numeric suffix to resolve a clash.
    """
    return unique_code(db, Supplier, slugify(name), "supplier")


def create_supplier(db: Session, data) -> Supplier:
    fields = data.model_dump()
    fields["code"] = fields.get("code") or _auto_supplier_code(db, data.name)
    supplier = Supplier(**fields)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def get_supplier(db: Session, supplier_id: int) -> Supplier:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise NotFoundError("Supplier not found")
    return supplier


def update_supplier(db: Session, supplier_id: int, data) -> Supplier:
    supplier = get_supplier(db, supplier_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


def delete_supplier(db: Session, supplier_id: int, *, actor_user_id: int | None) -> deletion.DeletionResult:
    """Remove the supplier outright, or deactivate it if it has purchase orders.

    purchase_orders.supplier_id is NOT NULL with no cascade, so the database
    would reject the delete anyway — checking first turns a raw integrity error
    into a message naming how many POs are in the way.
    """
    supplier = get_supplier(db, supplier_id)
    before = {"code": supplier.code, "name": supplier.name, "is_active": supplier.is_active}
    blockers = deletion.find_blockers(
        db, [("purchase_orders", select(PurchaseOrder.id).where(PurchaseOrder.supplier_id == supplier_id))]
    )
    if blockers:
        supplier.is_active = False
        mode = deletion.DEACTIVATED
    else:
        db.delete(supplier)
        mode = deletion.DELETED
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action=f"supplier.{mode}",
        entity_type="supplier",
        entity_id=supplier_id,
        before=before,
        after=None if mode == deletion.DELETED else {"is_active": False},
    )
    db.commit()
    return deletion.DeletionResult(mode, blockers)


# --------------------------------------------------------------------------
# Purchase orders
# --------------------------------------------------------------------------

def create_purchase_order(db: Session, data, actor_user_id: int) -> PurchaseOrder:
    subtotal = sum((item.qty_ordered * item.unit_cost for item in data.items), start=data.tax_total * 0)
    po = PurchaseOrder(
        po_number=_sequence_number("PO"),
        supplier_id=data.supplier_id,
        destination_location_id=data.destination_location_id,
        status="draft",
        currency=data.currency,
        exchange_rate=data.exchange_rate,
        subtotal=subtotal,
        tax_total=data.tax_total,
        shipping_cost=data.shipping_cost,
        total=subtotal + data.tax_total + data.shipping_cost,
        expected_at=data.expected_at,
        created_by_user_id=actor_user_id,
    )
    db.add(po)
    db.flush()
    for item in data.items:
        db.add(
            PurchaseOrderItem(
                purchase_order_id=po.id,
                variant_id=item.variant_id,
                qty_ordered=item.qty_ordered,
                qty_received=0,
                unit_cost=item.unit_cost,
                line_total=item.qty_ordered * item.unit_cost,
            )
        )
    db.commit()
    db.refresh(po)
    return get_purchase_order(db, po.id)


def attach_purchase_order_names(db: Session, orders: list[PurchaseOrder]) -> None:
    """Resolve supplier and destination to names for a page of orders, in two
    queries rather than two per row."""
    if not orders:
        return
    supplier_ids = {order.supplier_id for order in orders}
    location_ids = {order.destination_location_id for order in orders}
    suppliers = {
        row.id: row.name
        for row in db.execute(select(Supplier).where(Supplier.id.in_(supplier_ids))).scalars()
    }
    locations = {
        row.id: row.name_en or row.name_ar
        for row in db.execute(select(Location).where(Location.id.in_(location_ids))).scalars()
    }
    received = {
        row[0]: row[1]
        for row in db.execute(
            select(GoodsReceipt.purchase_order_id, func.count(GoodsReceipt.id))
            .where(GoodsReceipt.purchase_order_id.in_({order.id for order in orders}))
            .group_by(GoodsReceipt.purchase_order_id)
        ).all()
    }
    for order in orders:
        order.supplier_name = suppliers.get(order.supplier_id)
        order.destination_name = locations.get(order.destination_location_id)
        order.received_line_count = received.get(order.id, 0)


def list_purchase_orders(
    db: Session,
    cursor: str | None,
    limit: int,
    *,
    supplier_id: int | None = None,
    status: str | None = None,
    q: str | None = None,
):
    """Cursor-paginated on (created_at, id) descending — newest order first."""
    stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.items))
    if supplier_id is not None:
        stmt = stmt.where(PurchaseOrder.supplier_id == supplier_id)
    if status is not None:
        stmt = stmt.where(PurchaseOrder.status == status)
    if q and q.strip():
        stmt = stmt.where(PurchaseOrder.po_number.ilike(f"%{q.strip()}%"))
    items, next_cursor = paginate(db, stmt, PurchaseOrder, cursor, limit)
    attach_purchase_order_names(db, items)
    return items, next_cursor


def attach_goods_receipt_names(db: Session, receipts: list[GoodsReceipt]) -> None:
    if not receipts:
        return
    po_ids = {r.purchase_order_id for r in receipts if r.purchase_order_id}
    location_ids = {r.location_id for r in receipts}
    orders = {
        row.id: row
        for row in db.execute(select(PurchaseOrder).where(PurchaseOrder.id.in_(po_ids))).scalars()
    } if po_ids else {}
    supplier_ids = {order.supplier_id for order in orders.values()}
    suppliers = {
        row.id: row.name
        for row in db.execute(select(Supplier).where(Supplier.id.in_(supplier_ids))).scalars()
    } if supplier_ids else {}
    locations = {
        row.id: row.name_en or row.name_ar
        for row in db.execute(select(Location).where(Location.id.in_(location_ids))).scalars()
    }
    for receipt in receipts:
        order = orders.get(receipt.purchase_order_id) if receipt.purchase_order_id else None
        receipt.po_number = order.po_number if order else None
        receipt.supplier_name = suppliers.get(order.supplier_id) if order else None
        receipt.location_name = locations.get(receipt.location_id)


def list_goods_receipts(
    db: Session,
    cursor: str | None,
    limit: int,
    *,
    purchase_order_id: int | None = None,
    location_id: int | None = None,
):
    """Cursor-paginated on (created_at, id) descending — newest receipt first."""
    stmt = select(GoodsReceipt).options(selectinload(GoodsReceipt.items))
    if purchase_order_id is not None:
        stmt = stmt.where(GoodsReceipt.purchase_order_id == purchase_order_id)
    if location_id is not None:
        stmt = stmt.where(GoodsReceipt.location_id == location_id)
    items, next_cursor = paginate(db, stmt, GoodsReceipt, cursor, limit)
    attach_goods_receipt_names(db, items)
    return items, next_cursor


def get_purchase_order(db: Session, po_id: int) -> PurchaseOrder:
    po = db.get(PurchaseOrder, po_id, options=[selectinload(PurchaseOrder.items)])
    if po is None:
        raise NotFoundError("Purchase order not found")
    return po


def approve_purchase_order(db: Session, po_id: int, actor_user_id: int) -> PurchaseOrder:
    po = get_purchase_order(db, po_id)
    if po.status not in ("draft", "awaiting_approval"):
        raise BusinessRuleError(f"Cannot approve a purchase order in status '{po.status}'.")
    if po.created_by_user_id == actor_user_id:
        raise BusinessRuleError(
            "Approving a purchase order requires a different person than the one who created it.",
            code="second_approver_required",
        )
    po.status = "approved"
    po.approved_by_user_id = actor_user_id
    po.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(po)
    return get_purchase_order(db, po.id)


def mark_purchase_order_sent(db: Session, po_id: int) -> PurchaseOrder:
    po = get_purchase_order(db, po_id)
    if po.status != "approved":
        raise BusinessRuleError(f"Cannot mark as sent a purchase order in status '{po.status}'.")
    po.status = "sent"
    db.commit()
    db.refresh(po)
    return get_purchase_order(db, po.id)


def cancel_purchase_order(db: Session, po_id: int) -> PurchaseOrder:
    po = get_purchase_order(db, po_id)
    if po.status in ("received", "cancelled"):
        raise BusinessRuleError(f"Cannot cancel a purchase order in status '{po.status}'.")
    po.status = "cancelled"
    db.commit()
    db.refresh(po)
    return get_purchase_order(db, po.id)


# --------------------------------------------------------------------------
# Goods receipts
# --------------------------------------------------------------------------

def create_goods_receipt(db: Session, data, actor_user_id: int) -> GoodsReceipt:
    receipt = GoodsReceipt(
        receipt_number=_sequence_number("GRN"),
        purchase_order_id=data.purchase_order_id,
        location_id=data.location_id,
        supplier_invoice_number=data.supplier_invoice_number,
        received_by_user_id=actor_user_id,
        received_at=datetime.now(timezone.utc),
        note=data.note,
    )
    db.add(receipt)
    db.flush()

    po = None
    if data.purchase_order_id is not None:
        po = get_purchase_order(db, data.purchase_order_id)
        if po.status not in ("sent", "approved", "partially_received"):
            raise BusinessRuleError(f"Cannot receive against a purchase order in status '{po.status}'.")

    for item in sorted(data.items, key=lambda i: i.variant_id):
        db.add(
            GoodsReceiptItem(
                goods_receipt_id=receipt.id,
                purchase_order_item_id=item.purchase_order_item_id,
                variant_id=item.variant_id,
                qty=item.qty,
                qty_rejected=item.qty_rejected,
                unit_cost=item.unit_cost,
            )
        )
        if item.qty > 0:
            inventory_service.receive_stock(
                db,
                variant_id=item.variant_id,
                location_id=data.location_id,
                qty=item.qty,
                unit_cost=item.unit_cost,
                ref_type="purchase_order" if data.purchase_order_id else None,
                ref_id=data.purchase_order_id,
                actor_user_id=actor_user_id,
            )
        if po is not None and item.purchase_order_item_id is not None:
            po_item = db.get(PurchaseOrderItem, item.purchase_order_item_id)
            if po_item is not None:
                po_item.qty_received += item.qty

    if po is not None:
        db.flush()
        db.refresh(po)
        if all(i.qty_received >= i.qty_ordered for i in po.items):
            po.status = "received"
        elif any(i.qty_received > 0 for i in po.items):
            po.status = "partially_received"

    db.commit()
    db.refresh(receipt)
    return get_goods_receipt(db, receipt.id)


def get_goods_receipt(db: Session, receipt_id: int) -> GoodsReceipt:
    receipt = db.get(GoodsReceipt, receipt_id, options=[selectinload(GoodsReceipt.items)])
    if receipt is None:
        raise NotFoundError("Goods receipt not found")
    return receipt
