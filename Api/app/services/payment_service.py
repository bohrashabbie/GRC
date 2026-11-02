"""Online payment: turning what Hesabe reports into order state.

The one rule: an order is paid only when this server has asked Hesabe directly
and the answer matches the order's reference and amount. The customer's
redirect back and Hesabe's webhook are only prompts to go and ask — anyone can
call those URLs, and the webhook is unsigned.

Every path ends in settle(), which is idempotent: the redirect, the webhook and
the sweep may all arrive for the same payment, in any order. Stock and any
coupon are held from checkout, then released if the payment fails or is
abandoned.
"""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from urllib.parse import parse_qs, urlencode

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import hesabe
from app.config import settings
from app.database import SessionLocal
from app.middleware import storefront_cache
from app.middleware.error import BusinessRuleError
from app.models.orders import Order, OrderNote, OrderStatusHistory, Payment
from app.services import audit_service, coupon_service, order_service

log = logging.getLogger(__name__)

PROVIDER = "hesabe"
ONLINE_METHOD = "online"
#: How long stock stays held for a customer on the payment page.
PAYMENT_WINDOW = timedelta(minutes=30)
#: A payment this old with no outcome gets asked about, in case the customer
#: paid but both their redirect and the webhook were lost.
FIRST_CHECK_AFTER = timedelta(minutes=5)
_SWEEP_EVERY_SECONDS = 300

PAID = "paid"
FAILED = "failed"
PENDING = "pending"
REVIEW = "review"  # money arrived in a state staff must look at


@dataclass
class Outcome:
    order: Order | None
    status: str


def _hesabe_payment(db: Session, order_id: int) -> Payment | None:
    return db.execute(
        select(Payment)
        .where(Payment.order_id == order_id, Payment.provider == PROVIDER)
        .order_by(Payment.id.desc())
    ).scalars().first()


def _kuwaiti_mobile(phone: str | None) -> str | None:
    """Hesabe takes eight digits and no country code; anything else is left out
    rather than sent wrong, since the field is optional."""
    digits = "".join(ch for ch in phone or "" if ch.isdigit())
    if digits.startswith("965"):
        digits = digits[3:]
    return digits if len(digits) == 8 else None


def begin(db: Session, order: Order, *, customer_name: str | None) -> str:
    """Register the payment and return where to send the customer. If Hesabe
    will not take it, the order is unwound so its stock is not left held."""
    query = urlencode({"order": order.order_number})
    try:
        return hesabe.create_payment(
            reference=order.order_number,
            amount=Decimal(order.grand_total),
            return_url=f"{settings.shop_api_public_url}/shop/v1/payments/hesabe/return?{query}",
            webhook_url=f"{settings.shop_api_public_url}/shop/v1/payments/hesabe/webhook",
            name=customer_name,
            mobile=_kuwaiti_mobile(order.phone_e164),
        )
    except hesabe.HesabeError as exc:
        log.error("order %s: could not start payment: %s", order.order_number, exc)
        _cancel_unpaid(db, order, "gateway_unavailable", "Payment could not be started")
        raise BusinessRuleError(
            "Online payment is unavailable right now. Please try again, or choose cash on delivery.",
            code="payment_unavailable",
        ) from exc


def _record_status(db: Session, order: Order, field: str, from_value: str, to_value: str, reason: str) -> None:
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            field=field,
            from_value=from_value,
            to_value=to_value,
            actor_type="system",
            actor_user_id=None,
            reason=reason,
        )
    )


def _cancel_unpaid(db: Session, order: Order, failure_code: str, reason: str) -> None:
    """Release what an unpaid order holds. A no-op unless it is still waiting,
    so a late or repeated call can never touch an order that moved on."""
    locked = db.execute(select(Order).where(Order.id == order.id).with_for_update()).scalar_one()
    payment = _hesabe_payment(db, locked.id)
    if locked.status != "pending" or payment is None or payment.status != "initiated":
        db.rollback()
        return

    payment.status = "failed"
    payment.failure_code = failure_code
    before = {"status": locked.status, "payment_status": locked.payment_status}
    locked.status = "cancelled"
    locked.payment_status = "failed"
    locked.cancelled_at = datetime.now(timezone.utc)
    locked.cancel_reason = reason
    _record_status(db, locked, "status", before["status"], "cancelled", reason)
    _record_status(db, locked, "payment_status", before["payment_status"], "failed", reason)
    order_service.restore_stock_once(db, locked)
    coupon_service.release(db, locked.id)
    audit_service.record(
        db,
        actor_user_id=None,
        actor_type="system",
        action="order.payment_failed",
        entity_type="order",
        entity_id=locked.id,
        before=before,
        after={"status": "cancelled", "payment_status": "failed", "failure_code": failure_code},
    )
    db.commit()
    storefront_cache.bust()  # the stock is back on sale


def _note_for_staff(db: Session, order: Order, body: str) -> None:
    db.add(OrderNote(order_id=order.id, author_user_id=None, body=body, is_customer_visible=False))


def _capture(db: Session, order: Order, attempt: dict) -> str:
    locked = db.execute(select(Order).where(Order.id == order.id).with_for_update()).scalar_one()
    payment = _hesabe_payment(db, locked.id)
    if payment.status == "captured":
        db.rollback()
        return REVIEW if locked.status == "cancelled" else PAID

    before = {"payment_status": locked.payment_status, "payment": payment.status}
    payment.status = "captured"
    payment.captured_at = datetime.now(timezone.utc)
    payment.provider_payment_id = str(attempt.get("token"))
    payment.method = attempt.get("payment_type") or payment.method
    payment.failure_code = None
    payment.raw_response = attempt
    locked.payment_status = "paid"
    _record_status(db, locked, "payment_status", before["payment_status"], "paid", "Paid through Hesabe")

    if locked.status == "pending":
        locked.status = "confirmed"
        _record_status(db, locked, "status", "pending", "confirmed", "Paid through Hesabe")
        outcome = PAID
    else:
        # The customer paid after the order timed out or staff cancelled it.
        # Its stock may already be resold, so reviving it could oversell: the
        # money is recorded and a person decides.
        _note_for_staff(
            db,
            locked,
            f"Payment of {payment.amount} KWD was received after this order was cancelled "
            f"(Hesabe token {payment.provider_payment_id}). Refund it, or arrange fulfilment.",
        )
        log.error("order %s paid while %s; needs staff", locked.order_number, locked.status)
        outcome = REVIEW

    audit_service.record(
        db,
        actor_user_id=None,
        actor_type="system",
        action="order.payment_captured",
        entity_type="order",
        entity_id=locked.id,
        before=before,
        after={"payment_status": "paid", "payment": "captured", "status": locked.status},
    )
    db.commit()
    return outcome


def _flag_amount_mismatch(db: Session, order: Order, attempt: dict) -> None:
    payment = _hesabe_payment(db, order.id)
    if payment.failure_code == "amount_mismatch":
        return
    payment.failure_code = "amount_mismatch"
    _note_for_staff(
        db,
        order,
        f"Hesabe reports a successful payment of {attempt.get('amount')} KWD, but this order "
        f"is {payment.amount} KWD, so it was not marked paid (token {attempt.get('token')}).",
    )
    log.error("order %s: paid amount does not match", order.order_number)
    db.commit()


def _amount_matches(attempt: dict, expected: Decimal) -> bool:
    try:
        return Decimal(str(attempt.get("amount"))) == Decimal(expected)
    except InvalidOperation:
        return False


def settle(db: Session, order_number: str, *, abandoned: bool = False, declined: bool = False) -> Outcome:
    """Ask Hesabe about an order and bring it in line with the answer.

    `declined` is proof from Hesabe's own encrypted redirect. `abandoned` says
    the payment window has closed, so finding no attempt means nobody paid.
    """
    order = db.execute(select(Order).where(Order.order_number == order_number)).scalar_one_or_none()
    payment = _hesabe_payment(db, order.id) if order is not None else None
    if payment is None:
        return Outcome(order, FAILED)
    # Captured is final, so these URLs cannot be used to make this server keep
    # calling Hesabe about a finished order.
    if payment.status == "captured":
        return Outcome(order, REVIEW if order.status == "cancelled" else PAID)

    try:
        attempts = hesabe.find_transactions(order_number)
    except hesabe.HesabeError as exc:
        log.warning("order %s: payment not verified yet: %s", order_number, exc)
        return Outcome(order, PENDING)

    succeeded = [a for a in attempts if a.get("status") == "SUCCESSFUL"]
    matching = [a for a in succeeded if _amount_matches(a, payment.amount)]
    if matching:
        return Outcome(order, _capture(db, order, matching[0]))
    if succeeded:
        _flag_amount_mismatch(db, order, succeeded[0])
        return Outcome(order, REVIEW)

    if payment.status == "failed":
        return Outcome(order, FAILED)
    # FAILED from Hesabe, or its own redirect, or nothing by the deadline.
    # Anything else (PENDING, or no attempt inside the window) keeps waiting.
    failed = any(a.get("status") == "FAILED" for a in attempts)
    if failed or declined or (abandoned and not attempts):
        _cancel_unpaid(db, order, "declined" if failed or declined else "abandoned", "Online payment not completed")
        return Outcome(order, FAILED)
    return Outcome(order, PENDING)


def _declined_by_hesabe(order_number: str, data: str | None) -> bool:
    """Whether a redirect's payload is Hesabe saying this order failed. It is
    encrypted with our key, so unlike the URL around it, it cannot be made up —
    which is what stops a crafted link from cancelling someone's order."""
    if not data:
        return False
    try:
        body = json.loads(hesabe.decrypt(data))
        return body.get("status") is False and body["response"]["orderReferenceNumber"] == order_number
    except (ValueError, KeyError, TypeError):
        return False


def handle_return(db: Session, order_number: str, data: str | None) -> str:
    """Settle a returning customer's order, and say where to send them. Must
    always produce a page: this customer may have just paid, and a raw error
    is the worst thing to show them. The sweep will finish the job."""
    try:
        outcome = settle(db, order_number, declined=_declined_by_hesabe(order_number, data))
    except Exception:  # noqa: BLE001
        db.rollback()
        log.exception("order %s: could not settle on return", order_number)
        outcome = Outcome(None, PENDING)
    base = settings.storefront_base_url
    locale = outcome.order.locale if outcome.order is not None else "ar"
    if outcome.status == FAILED:
        return f"{base}/{locale}/checkout?payment=failed"
    query = urlencode({"order": order_number, "payment": outcome.status})
    return f"{base}/{locale}/checkout/confirmation?{query}"


def handle_webhook(db: Session, body: bytes) -> None:
    """Hesabe's notification, read only for which order to go and ask about.
    The documented shape is JSON; form encoding is accepted in case."""
    try:
        parsed = json.loads(body)
        reference = parsed.get("reference_number") if isinstance(parsed, dict) else None
    except ValueError:
        values = parse_qs(body.decode(errors="ignore")).get("reference_number")
        reference = values[0] if values else None
    if reference:
        settle(db, str(reference))


def expire_abandoned(db: Session) -> int:
    """Chase payments with no outcome: pick up any that were paid while the
    redirect and webhook were both lost, and once the window closes, release
    the stock. One order failing must not stop the rest being checked."""
    now = datetime.now(timezone.utc)
    rows = db.execute(
        select(Order.order_number, Payment.created_at)
        .join(Payment, Payment.order_id == Order.id)
        .where(
            Payment.provider == PROVIDER,
            Payment.status == "initiated",
            Payment.created_at < now - FIRST_CHECK_AFTER,
        )
    ).all()
    for number, created_at in rows:
        try:
            settle(db, number, abandoned=created_at < now - PAYMENT_WINDOW)
        except Exception:  # noqa: BLE001
            db.rollback()
            log.exception("order %s: sweep could not settle it", number)
    return len(rows)


def start_sweeper() -> threading.Event:
    """Run expire_abandoned on a timer inside the API process. The stack has no
    worker, and this is the one job that cannot wait for a request to arrive.
    Set the returned event to stop it."""
    stop = threading.Event()

    def run() -> None:
        while not stop.wait(_SWEEP_EVERY_SECONDS):
            try:
                with SessionLocal() as db:
                    expire_abandoned(db)
            except Exception:  # noqa: BLE001 - one bad run must not end the loop
                log.exception("payment sweep failed")

    threading.Thread(target=run, name="payment-sweeper", daemon=True).start()
    return stop
