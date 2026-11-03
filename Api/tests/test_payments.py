"""Online payment, against the real database and a stand-in for Hesabe.

The guarantee under test: an order is paid only when Hesabe itself says so, for
the right amount; nothing a browser or webhook sends can change that; and an
unpaid order always gives its stock and coupon back, exactly once.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
from sqlalchemy import func, select

from app import hesabe
from app.config import settings
from app.database import SessionLocal
from app.models.auth import AuditLog
from app.middleware.error import BusinessRuleError
from app.models.inventory import StockLevel
from app.models.orders import Coupon, CouponRedemption, Order, OrderNote, Payment
from app.services import checkout_service, payment_service

KEY = "PkW64zMe5NVdrlPVNnjo2Jy9nOb7v1Xg"
IV = "5NVdrlPVNnjo2Jy9"


@pytest.fixture(autouse=True)
def hesabe_keys(monkeypatch):
    monkeypatch.setattr(settings, "hesabe_base_url", "https://hesabe.test")
    monkeypatch.setattr(settings, "hesabe_merchant_code", "842217")
    monkeypatch.setattr(settings, "hesabe_access_code", "access")
    monkeypatch.setattr(settings, "hesabe_secret_key", KEY)
    monkeypatch.setattr(settings, "hesabe_iv_key", IV)
    monkeypatch.setattr(settings, "storefront_revalidate_url", "")


@pytest.fixture
def gateway(monkeypatch):
    """What Hesabe will answer. `attempts` is the enquiry result; set `down` to
    make the enquiry itself fail."""
    state = SimpleNamespace(attempts=[], down=False, refuse_checkout=False)

    def find_transactions(_reference):
        if state.down:
            raise hesabe.HesabeError("unreachable")
        return state.attempts

    def create_payment(**_kwargs):
        if state.refuse_checkout:
            raise hesabe.HesabeError("refused")
        return "https://hesabe.test/payment?data=token"

    monkeypatch.setattr(hesabe, "find_transactions", find_transactions)
    monkeypatch.setattr(hesabe, "create_payment", create_payment)
    return state


def _payload(variant_id: int, coupon: str | None = None):
    return SimpleNamespace(
        lines=[SimpleNamespace(variant_id=variant_id, quantity=1)],
        email="shopper@example.com",
        shipping_address=SimpleNamespace(
            full_name="Abdullah Al Mutairi",
            phone="+96551234567",
            governorate_id="hawalli",
            area_id="salmiya",
            block="10",
            street="1",
            building="24",
            extra_directions=None,
        ),
        shipping_method_id="standard",
        payment_method_code="online",
        coupon_code=coupon,
    )


def _order(session, variant_id: int, coupon: str | None = None) -> Order:
    return checkout_service.create_order(session, _payload(variant_id, coupon))


def _on_hand(session, variant_id: int) -> int:
    session.expire_all()
    return session.execute(select(StockLevel.on_hand).where(StockLevel.variant_id == variant_id)).scalar_one()


def _payment(session, order: Order) -> Payment:
    session.expire_all()
    return session.execute(select(Payment).where(Payment.order_id == order.id)).scalar_one()


def _attempt(order: Order, status: str = "SUCCESSFUL", amount: str | None = None) -> dict:
    return {
        "token": f"tok-{order.order_number}",
        "amount": amount if amount is not None else f"{order.grand_total:.3f}",
        "reference_number": order.order_number,
        "status": status,
        "payment_type": "KNET",
    }


def _hesabe_redirect(order: Order, *, paid: bool) -> str:
    body = {"status": paid, "response": {"orderReferenceNumber": order.order_number}}
    return hesabe.encrypt(json.dumps(body))


def test_encryption_round_trips_and_pads_to_32_bytes():
    cipher_text = hesabe.encrypt('{"amount":"1.000"}')
    assert len(bytes.fromhex(cipher_text)) % 32 == 0
    assert hesabe.decrypt(cipher_text) == '{"amount":"1.000"}'


@pytest.mark.parametrize("junk", ["", "zz", "abcd", "00" * 16])
def test_decrypting_junk_is_an_error_not_a_result(junk):
    with pytest.raises(ValueError):
        hesabe.decrypt(junk)


def test_online_is_offered_only_with_keys(monkeypatch):
    assert checkout_service.enabled_payment_methods() == ["online"]
    monkeypatch.setattr(settings, "hesabe_secret_key", "")
    assert checkout_service.enabled_payment_methods() == []


@pytest.mark.parametrize("field,value", [("hesabe_secret_key", KEY[:-1]), ("hesabe_iv_key", IV + "x")])
def test_a_mistyped_key_turns_online_off_rather_than_crashing_checkout(monkeypatch, field, value):
    monkeypatch.setattr(settings, field, value)
    assert checkout_service.enabled_payment_methods() == []


def test_a_new_online_order_waits_unpaid_with_its_stock_held(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id

    order = _order(session, variant_id)

    assert (order.status, order.payment_status) == ("pending", "unpaid")
    assert _payment(session, order).status == "initiated"
    assert _on_hand(session, variant_id) == 4


def test_verified_payment_confirms_the_order(factory, session, gateway):
    order = _order(session, factory.product(stock=5).variants[0].id)
    gateway.attempts = [_attempt(order)]

    assert payment_service.settle(session, order.order_number).status == payment_service.PAID

    payment = _payment(session, order)
    assert (order.status, order.payment_status) == ("confirmed", "paid")
    assert payment.status == "captured"
    assert payment.provider_payment_id == f"tok-{order.order_number}"
    assert payment.method == "KNET"


def test_redirect_webhook_and_sweep_all_arriving_change_nothing_twice(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)
    gateway.attempts = [_attempt(order)]

    payment_service.handle_return(session, order.order_number, None)
    payment_service.handle_webhook(session, json.dumps({"reference_number": order.order_number}).encode())
    payment_service.settle(session, order.order_number, abandoned=True)

    session.expire_all()
    assert (order.status, order.payment_status) == ("confirmed", "paid")
    assert _on_hand(session, variant_id) == 4


def test_the_redirect_and_webhook_racing_capture_exactly_once(factory, session, gateway):
    """They really do arrive together. Separate connections, the same order: the
    row lock must make one wait, and the rest must find the work already done."""
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)
    number = order.order_number
    gateway.attempts = [_attempt(order)]
    session.commit()
    outcomes: list[str] = []
    barrier = threading.Barrier(4)

    def arrive() -> None:
        with SessionLocal() as db:
            barrier.wait()
            outcomes.append(payment_service.settle(db, number).status)

    threads = [threading.Thread(target=arrive) for _ in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert outcomes == [payment_service.PAID] * 4
    session.expire_all()
    assert (order.status, order.payment_status) == ("confirmed", "paid")
    captured = session.execute(
        select(func.count()).select_from(AuditLog).where(
            AuditLog.entity_id == order.id, AuditLog.action == "order.payment_captured"
        )
    ).scalar_one()
    assert captured == 1


def test_a_settled_order_stops_asking_hesabe(factory, session, gateway, monkeypatch):
    order = _order(session, factory.product(stock=5).variants[0].id)
    gateway.attempts = [_attempt(order)]
    payment_service.settle(session, order.order_number)

    def must_not_call(_reference):
        raise AssertionError("asked Hesabe about a finished order")

    monkeypatch.setattr(hesabe, "find_transactions", must_not_call)
    assert payment_service.settle(session, order.order_number).status == payment_service.PAID


def test_a_customer_returning_during_a_fault_still_gets_a_page(factory, session, gateway, monkeypatch):
    order = _order(session, factory.product(stock=5).variants[0].id)

    def explode(*_args, **_kwargs):
        raise RuntimeError("database fell over")

    monkeypatch.setattr(payment_service, "settle", explode)
    url = payment_service.handle_return(session, order.order_number, None)
    assert "payment=pending" in url and order.order_number in url


def test_a_forged_success_link_pays_nothing(factory, session, gateway):
    """Hesabe has no record of this order, so a URL claiming success is ignored,
    even carrying a payload that decrypts."""
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)

    url = payment_service.handle_return(session, order.order_number, _hesabe_redirect(order, paid=True))

    session.expire_all()
    assert (order.status, order.payment_status) == ("pending", "unpaid")
    assert "payment=pending" in url


def test_a_forged_webhook_pays_nothing(factory, session, gateway):
    order = _order(session, factory.product(stock=5).variants[0].id)
    body = {"reference_number": order.order_number, "status": "SUCCESSFUL", "amount": "99.000"}

    payment_service.handle_webhook(session, json.dumps(body).encode())

    session.expire_all()
    assert order.payment_status == "unpaid"


@pytest.mark.parametrize("data", [None, "not-hex", "00" * 32])
def test_a_crafted_link_cannot_cancel_someones_order(factory, session, gateway, data):
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)

    payment_service.handle_return(session, order.order_number, data)

    session.expire_all()
    assert order.status == "pending"
    assert _on_hand(session, variant_id) == 4


def test_another_orders_decline_cannot_cancel_this_one(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)
    other = _order(session, variant_id)

    payment_service.handle_return(session, order.order_number, _hesabe_redirect(other, paid=False))

    session.expire_all()
    assert order.status == "pending"


def test_a_wrong_amount_is_not_paid_and_staff_are_told(factory, session, gateway):
    order = _order(session, factory.product(stock=5).variants[0].id)
    gateway.attempts = [_attempt(order, amount="0.200")]

    assert payment_service.settle(session, order.order_number).status == payment_service.REVIEW
    payment_service.settle(session, order.order_number)

    session.expire_all()
    assert order.payment_status == "unpaid"
    notes = session.execute(select(OrderNote).where(OrderNote.order_id == order.id)).scalars().all()
    assert len(notes) == 1 and "not marked paid" in notes[0].body


def test_a_decline_cancels_and_returns_stock_once(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)
    gateway.attempts = [_attempt(order, status="FAILED")]

    url = payment_service.handle_return(session, order.order_number, _hesabe_redirect(order, paid=False))
    payment_service.settle(session, order.order_number)

    session.expire_all()
    assert (order.status, order.payment_status) == ("cancelled", "failed")
    assert _payment(session, order).status == "failed"
    assert _on_hand(session, variant_id) == 5
    assert url.endswith("/checkout?payment=failed")


def test_a_decline_gives_the_coupon_back(factory, session, gateway):
    from sqlalchemy import delete

    code = f"T{order_tag()}"
    coupon = Coupon(code=code, discount_type="percent", value=Decimal("10"), is_active=True, times_redeemed=0, max_redemptions=1)
    session.add(coupon)
    session.commit()
    try:
        order = _order(session, factory.product(stock=5).variants[0].id, coupon=code)
        session.refresh(coupon)
        assert coupon.times_redeemed == 1

        gateway.attempts = [_attempt(order, status="FAILED")]
        payment_service.settle(session, order.order_number)

        session.expire_all()
        assert coupon.times_redeemed == 0
        assert not session.execute(
            select(CouponRedemption).where(CouponRedemption.order_id == order.id)
        ).first()
    finally:
        session.rollback()
        session.execute(delete(Coupon).where(Coupon.id == coupon.id))
        session.commit()


def order_tag() -> str:
    return datetime.now(timezone.utc).strftime("%H%M%S%f")


def test_while_hesabe_is_unreachable_nothing_is_decided(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)
    gateway.down = True

    url = payment_service.handle_return(session, order.order_number, _hesabe_redirect(order, paid=True))
    payment_service.settle(session, order.order_number, abandoned=True)

    session.expire_all()
    assert order.status == "pending"
    assert _on_hand(session, variant_id) == 4
    assert "payment=pending" in url


def test_payment_after_cancellation_keeps_the_money_and_flags_staff(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)
    payment_service.settle(session, order.order_number, abandoned=True)
    assert _on_hand(session, variant_id) == 5

    gateway.attempts = [_attempt(order)]
    assert payment_service.settle(session, order.order_number).status == payment_service.REVIEW

    session.expire_all()
    assert (order.status, order.payment_status) == ("cancelled", "paid")
    assert _payment(session, order).status == "captured"
    # The stock may be sold to someone else by now, so it is not taken again.
    assert _on_hand(session, variant_id) == 5
    assert "Refund it" in session.execute(
        select(OrderNote.body).where(OrderNote.order_id == order.id)
    ).scalar_one()


def _age(session, order: Order, minutes: int) -> None:
    _payment(session, order).created_at = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    session.commit()


def test_the_sweep_releases_only_abandoned_payments(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id
    fresh = _order(session, variant_id)
    stale = _order(session, variant_id)
    _age(session, stale, minutes=31)

    payment_service.expire_abandoned(session)

    session.expire_all()
    assert fresh.status == "pending"
    assert stale.status == "cancelled"
    assert _on_hand(session, variant_id) == 4


def test_the_sweep_finds_a_payment_within_minutes_when_every_signal_was_lost(factory, session, gateway):
    order = _order(session, factory.product(stock=5).variants[0].id)
    _age(session, order, minutes=6)
    gateway.attempts = [_attempt(order)]

    payment_service.expire_abandoned(session)

    session.expire_all()
    assert (order.status, order.payment_status) == ("confirmed", "paid")


def test_the_sweep_leaves_a_customer_still_on_the_payment_page_alone(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)
    _age(session, order, minutes=6)

    payment_service.expire_abandoned(session)

    session.expire_all()
    assert order.status == "pending"
    assert _on_hand(session, variant_id) == 4


def test_one_bad_order_does_not_stop_the_sweep(factory, session, gateway, monkeypatch):
    variant_id = factory.product(stock=5).variants[0].id
    first, second = _order(session, variant_id), _order(session, variant_id)
    _age(session, first, minutes=31)
    _age(session, second, minutes=31)
    real_find, seen = hesabe.find_transactions, []

    def flaky(reference):
        seen.append(reference)
        if len(seen) == 1:
            raise RuntimeError("one malformed reply")
        return real_find(reference)

    monkeypatch.setattr(hesabe, "find_transactions", flaky)
    payment_service.expire_abandoned(session)

    session.expire_all()
    assert len(seen) == 2
    assert sorted((first.status, second.status)) == ["cancelled", "pending"]


def test_when_hesabe_refuses_checkout_the_order_is_unwound(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id
    order = _order(session, variant_id)
    gateway.refuse_checkout = True

    with pytest.raises(BusinessRuleError) as exc:
        payment_service.begin(session, order, customer_name="Abdullah")

    assert exc.value.code == "payment_unavailable"
    session.expire_all()
    assert order.status == "cancelled"
    assert _on_hand(session, variant_id) == 5


def test_a_return_for_an_unknown_order_goes_nowhere_harmful(session, gateway):
    assert payment_service.handle_return(session, "GRC-0", None).endswith("/ar/checkout?payment=failed")


def test_enquiry_reads_both_shapes_and_ignores_other_orders(monkeypatch):
    """Hesabe returns `results` as a list or as {"data": [...]}, so an attempt
    for some other reference must never be counted as this order's."""
    mine = {"token": "1", "reference_number": "GRC-1", "status": "FAILED"}
    paid = {"token": "2", "reference_number": "GRC-1", "status": "SUCCESSFUL"}
    other = {"token": "3", "reference_number": "GRC-2", "status": "SUCCESSFUL"}

    for results in ({"data": [mine, paid, other]}, [mine, paid, other]):
        body = {"status": True, "data": mine, "results": results}
        response = SimpleNamespace(status_code=200, json=lambda b=body: b)
        monkeypatch.setattr(hesabe.httpx, "get", lambda *_a, **_k: response)
        found = hesabe.find_transactions("GRC-1")
        assert sorted(a["token"] for a in found) == ["1", "2"]


def test_a_guest_can_place_an_order(factory, session, gateway):
    """No account: the order belongs to the email given at checkout."""
    order = _order(session, factory.product(stock=5).variants[0].id)
    assert order.customer_id is None
    assert order.email == "shopper@example.com"


def _gulf_payload(variant_id: int, country: str, shipping: str = "standard"):
    payload = _payload(variant_id)
    payload.shipping_method_id = shipping
    payload.shipping_address = SimpleNamespace(
        country_code=country,
        full_name="Fahad Al Otaibi",
        phone="+966501234567",
        governorate_id=None,
        area_id=None,
        city="Riyadh",
        district="Al Olaya",
        block=None,
        street="King Fahd Road",
        building="14",
        extra_directions=None,
    )
    return payload


def test_an_order_can_be_delivered_elsewhere_in_the_gulf(factory, session, gateway):
    from app.models.orders import OrderAddress

    order = checkout_service.create_order(session, _gulf_payload(factory.product(stock=5).variants[0].id, "SA"), locale="en")

    address = session.execute(select(OrderAddress).where(OrderAddress.order_id == order.id)).scalar_one()
    assert (address.country_code, address.city, address.district, address.region_name) == (
        "SA", "Riyadh", "Al Olaya", "Saudi Arabia"
    )


def test_store_pickup_is_refused_outside_kuwait(factory, session, gateway):
    variant_id = factory.product(stock=5).variants[0].id

    with pytest.raises(BusinessRuleError) as exc:
        checkout_service.create_order(session, _gulf_payload(variant_id, "AE", shipping="pickup"))

    assert exc.value.code == "pickup_kuwait_only"
    session.rollback()
    assert _on_hand(session, variant_id) == 5


def test_the_checkout_schema_refuses_cash_and_incomplete_addresses():
    from pydantic import ValidationError

    from app.schemas.shop import CheckoutIn

    base = {
        "lines": [{"variant_id": 1, "quantity": 1}],
        "email": "a@b.co",
        "shipping_method_id": "standard",
        "shipping_address": {
            "full_name": "Abdullah", "phone": "+96551234567", "governorate_id": "hawalli",
            "area_id": "salmiya", "block": "10", "street": "1", "building": "2",
        },
    }
    assert CheckoutIn(**base).payment_method_code == "online"
    with pytest.raises(ValidationError):
        CheckoutIn(**{**base, "payment_method_code": "cod"})
    with pytest.raises(ValidationError):  # Kuwait without a block
        CheckoutIn(**{**base, "shipping_address": {**base["shipping_address"], "block": ""}})
    with pytest.raises(ValidationError):  # abroad without a city
        CheckoutIn(**{**base, "shipping_address": {**base["shipping_address"], "country_code": "QA"}})


def test_mobile_is_sent_only_as_eight_kuwaiti_digits():
    assert payment_service._kuwaiti_mobile("+96551234567") == "51234567"
    assert payment_service._kuwaiti_mobile("+971501234567") is None
    assert payment_service._kuwaiti_mobile(None) is None
