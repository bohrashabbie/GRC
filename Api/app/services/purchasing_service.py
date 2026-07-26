"""Suppliers, purchase orders, and goods receipts. Receiving goods writes
stock through inventory_service — never touches stock_levels directly.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.purchasing import (
    GoodsReceipt,
    GoodsReceiptItem,
    PurchaseOrder,
    PurchaseOrderItem,
    Supplier,
)
from app.services import inventory_service


def _sequence_number(prefix: str) -> str:
    now = datetime.now(timezone.utc)
    return f"{prefix}-{now:%Y}-{int(now.timestamp()) % 100000:05d}"


# --------------------------------------------------------------------------
# Suppliers
# --------------------------------------------------------------------------

def create_supplier(db: Session, data) -> Supplier:
    supplier = Supplier(**data.model_dump())
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


def deactivate_supplier(db: Session, supplier_id: int) -> None:
    supplier = get_supplier(db, supplier_id)
    supplier.is_active = False
    db.commit()


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
