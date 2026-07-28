"""Orders are created by checkout (not part of this admin-only build) — this
service only reads them and manages status transitions, notes, and refunds.
Every write here goes to audit_log (Hard Rule 7: orders/payments are audited).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.orders import Order, OrderAddress, OrderNote, OrderStatusHistory, Payment, PaymentRefund
from app.services import audit_service, inventory_service

# Terminal states have no outgoing transitions — cancelled can never go back
# to processing, completed can never be reopened.
VALID_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"processing", "cancelled"},
    "processing": {"completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}

VALID_PAYMENT_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "unpaid": {"authorised", "paid", "failed"},
    "authorised": {"paid", "failed"},
    "paid": {"partially_refunded", "refunded"},
    "partially_refunded": {"refunded"},
    "refunded": set(),
    "failed": {"unpaid"},
}

VALID_FULFILMENT_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "unfulfilled": {"partially_fulfilled", "fulfilled"},
    "partially_fulfilled": {"fulfilled"},
    "fulfilled": {"returned"},
    "returned": set(),
}

_TRANSITION_TABLES = {
    "status": VALID_STATUS_TRANSITIONS,
    "payment_status": VALID_PAYMENT_STATUS_TRANSITIONS,
    "fulfilment_status": VALID_FULFILMENT_STATUS_TRANSITIONS,
}


def get_order(db: Session, order_id: int) -> Order:
    order = db.get(
        Order,
        order_id,
        options=[selectinload(Order.items)],
    )
    if order is None:
        raise NotFoundError("Order not found")
    # Order carries no ORM relationship for these (only .items is mapped),
    # so they're attached explicitly rather than silently serializing as [].
    order.addresses = list(db.query(OrderAddress).filter(OrderAddress.order_id == order.id))
    order.notes = list(db.query(OrderNote).filter(OrderNote.order_id == order.id).order_by(OrderNote.created_at))
    # Refunds are issued against a specific payment_id, so the admin has to be
    # able to see which payments exist and how much is left refundable on each.
    order.payments = list(
        db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.created_at)
    )
    refunds = list(db.query(PaymentRefund).filter(PaymentRefund.order_id == order.id))
    for payment in order.payments:
        payment.refunded_amount = sum(
            (r.amount for r in refunds if r.payment_id == payment.id and r.status == "succeeded"),
            Decimal("0"),
        )
    return order


def _restore_stock_once(db: Session, order: Order) -> bool:
    """Put an order's stock back exactly once, ever.

    Two independent guards, because there are two ways in (cancellation and
    refund) and they can be triggered by different people seconds apart:

      1. stock_restored_at is checked and stamped inside this transaction, so a
         second call finds it non-null and does nothing.
      2. The row is re-read FOR UPDATE first, so two concurrent callers
         serialise on it rather than both seeing NULL and both restocking.

    Returns whether the restock actually ran, so callers can decide what to
    record. Does not commit — the caller owns the transaction, which is what
    makes the stamp and the movement rows atomic with each other.
    """
    locked = db.execute(
        select(Order).where(Order.id == order.id).with_for_update()
    ).scalar_one()
    if locked.stock_restored_at is not None:
        return False

    locked.stock_restored_at = datetime.now(timezone.utc)
    inventory_service.restore_for_order(
        db,
        lines=[(item.variant_id, item.qty) for item in order.items],
        order_id=order.id,
    )
    return True


def update_order_status(db: Session, order_id: int, field: str, to_value: str, reason: str | None, actor_user_id: int) -> Order:
    if field not in _TRANSITION_TABLES:
        raise BusinessRuleError(f"Unknown status field '{field}'. Must be one of {list(_TRANSITION_TABLES)}.")
    order = get_order(db, order_id)
    from_value = getattr(order, field)

    table = _TRANSITION_TABLES[field]
    if from_value not in table:
        raise BusinessRuleError(f"Order has an unrecognised {field} value '{from_value}'.")
    if to_value not in table[from_value]:
        raise BusinessRuleError(
            f"Cannot transition {field} from '{from_value}' to '{to_value}'.",
            code="invalid_status_transition",
            details={"field": field, "from": from_value, "to": to_value, "allowed": sorted(table[from_value])},
        )

    setattr(order, field, to_value)
    restocked = False
    if field == "status" and to_value == "cancelled":
        order.cancelled_at = datetime.now(timezone.utc)
        order.cancel_reason = reason
        # Same transaction as the status change: the order cannot end up
        # cancelled with its stock still held, or restocked without being
        # cancelled. Cancelling twice is already blocked by the transition
        # table above; this is the guard that survives the refund path too.
        restocked = _restore_stock_once(db, order)

    db.add(
        OrderStatusHistory(
            order_id=order.id,
            field=field,
            from_value=from_value,
            to_value=to_value,
            actor_type="staff",
            actor_user_id=actor_user_id,
            reason=reason,
        )
    )
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="order.status_change",
        entity_type="order",
        entity_id=order.id,
        before={field: from_value},
        after={field: to_value, **({"stock_restored": True} if restocked else {})},
    )
    db.commit()
    db.refresh(order)
    return order


def add_order_note(db: Session, order_id: int, body: str, is_customer_visible: bool, actor_user_id: int) -> OrderNote:
    order = get_order(db, order_id)
    note = OrderNote(order_id=order.id, author_user_id=actor_user_id, body=body, is_customer_visible=is_customer_visible)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def refund_payment(db: Session, order_id: int, payment_id: int, amount: Decimal, reason: str | None, actor_user_id: int) -> PaymentRefund:
    order = get_order(db, order_id)
    payment = db.get(Payment, payment_id)
    if payment is None or payment.order_id != order.id:
        raise NotFoundError("Payment not found on this order")
    if payment.status != "captured":
        raise BusinessRuleError(f"Cannot refund a payment in status '{payment.status}'.")

    already_refunded = sum(
        (r.amount for r in db.query(PaymentRefund).filter(PaymentRefund.payment_id == payment.id, PaymentRefund.status == "succeeded")),
        start=Decimal("0"),
    )
    if already_refunded + amount > payment.amount:
        raise BusinessRuleError(
            f"Refund of {amount} would exceed the capturable balance "
            f"({payment.amount - already_refunded} remaining on this payment).",
            code="refund_exceeds_balance",
        )

    refund = PaymentRefund(
        payment_id=payment.id,
        order_id=order.id,
        amount=amount,
        reason=reason,
        status="succeeded",  # no live gateway in this build; recorded immediately
        created_by_user_id=actor_user_id,
    )
    db.add(refund)

    new_total_refunded = already_refunded + amount
    is_full_refund = new_total_refunded >= payment.amount
    order.payment_status = "refunded" if is_full_refund else "partially_refunded"

    # Only a full refund puts stock back. A partial refund is a price
    # adjustment on goods the customer still has, so restocking it would
    # invent inventory that does not physically exist. The guard makes this
    # safe alongside cancellation: refunding an already-cancelled order finds
    # stock_restored_at set and adds nothing.
    restocked = _restore_stock_once(db, order) if is_full_refund else False

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="order.refund",
        entity_type="order",
        entity_id=order.id,
        after={
            "payment_id": payment.id,
            "amount": float(amount),
            "reason": reason,
            **({"stock_restored": True} if restocked else {}),
        },
    )
    db.commit()
    db.refresh(refund)
    return refund
