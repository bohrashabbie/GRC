from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.orders import Order
from app.schemas.order import OrderNoteIn, OrderNoteOut, OrderOut, OrderStatusUpdate, PaymentRefundOut, RefundRequest
from app.services import order_service
from app.utils import paginate

router = APIRouter()


@router.get("")
def list_orders(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    status_: str | None = Query(None, alias="status"),
    payment_status: str | None = None,
    fulfilment_status: str | None = None,
    customer_id: int | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("order.view")),
) -> dict:
    """Cursor-paginated on (created_at, id) descending. Filters: status,
    payment_status, fulfilment_status, customer_id."""
    stmt = select(Order).options(selectinload(Order.items))
    if status_ is not None:
        stmt = stmt.where(Order.status == status_)
    if payment_status is not None:
        stmt = stmt.where(Order.payment_status == payment_status)
    if fulfilment_status is not None:
        stmt = stmt.where(Order.fulfilment_status == fulfilment_status)
    if customer_id is not None:
        stmt = stmt.where(Order.customer_id == customer_id)
    items, next_cursor = paginate(db, stmt, Order, cursor, limit)
    return {"items": [OrderOut.model_validate(o) for o in items], "next_cursor": next_cursor}


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), _user=Depends(require("order.view"))) -> Order:
    return order_service.get_order(db, order_id)


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("order.update_status")),
) -> Order:
    return order_service.update_order_status(db, order_id, payload.field, payload.to_value, payload.reason, current_user.id)


@router.post("/{order_id}/notes", response_model=OrderNoteOut, status_code=201)
def add_order_note(
    order_id: int,
    payload: OrderNoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("order.note")),
):
    return order_service.add_order_note(db, order_id, payload.body, payload.is_customer_visible, current_user.id)


@router.post("/{order_id}/refund", response_model=PaymentRefundOut, status_code=201)
def refund_order_payment(
    order_id: int,
    payload: RefundRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("order.refund")),
):
    return order_service.refund_payment(db, order_id, payload.payment_id, payload.amount, payload.reason, current_user.id)


# Permission keys used by this router: order.view, order.update_status, order.note, order.refund
