"""Sending orders to Porter Express, against the real database and a stand-in
for Porter: what is booked, who may book it, and what comes back."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app import porter
from app.config import settings
from app.middleware.error import BusinessRuleError, ConflictError
from app.models.orders import Order, OrderAddress, Shipment
from app.services import checkout_service, shipping_service

AREAS = [
    {"id": "area-salmiya-0000", "name": "HAWALLY-SALMIYA"},
    {"id": "area-bneid-000000", "name": "KUWAIT CITY-BNEID AL GAR"},
    {"id": "area-jabriya-0000", "name": "HAWALLY-JABRIYA"},
]


@pytest.fixture(autouse=True)
def keys(monkeypatch):
    monkeypatch.setattr(settings, "hesabe_base_url", "https://hesabe.test")
    monkeypatch.setattr(settings, "hesabe_merchant_code", "842217")
    monkeypatch.setattr(settings, "hesabe_access_code", "access")
    monkeypatch.setattr(settings, "hesabe_secret_key", "k" * 32)
    monkeypatch.setattr(settings, "hesabe_iv_key", "i" * 16)
    monkeypatch.setattr(settings, "storefront_revalidate_url", "")
    monkeypatch.setattr(settings, "porter_base_url", "https://porter.test")
    monkeypatch.setattr(settings, "porter_email", "ops@example.com")
    monkeypatch.setattr(settings, "porter_password", "secret")


@pytest.fixture
def courier(monkeypatch):
    state = SimpleNamespace(booked=[], history=[])
    monkeypatch.setattr(porter, "account", lambda: {
        "branch_id": "branch-1", "customer_id": "customer-1",
        "pickup_address": {"name": "Office", "contactPerson": "GR8", "description": "Mubarak Al Kabeer St.",
                           "cellNo": "+96597275271", "countryCode": "KW", "encryptedCityId": "city-1",
                           "encryptedAreaId": "area-office"},
    })
    monkeypatch.setattr(porter, "services", lambda: {
        "DS": {"id": "svc-ds", "name": "DOMESTIC STANDARD"}, "DE": {"id": "svc-de", "name": "DOMESTIC EXPRESS"},
    })
    monkeypatch.setattr(porter, "areas", lambda: AREAS)

    def create(payload):
        state.booked.append(payload)
        return {"awbNo": f"PX{len(state.booked):08d}"}

    monkeypatch.setattr(porter, "create_shipment", create)
    monkeypatch.setattr(porter, "tracking", lambda awb: state.history)
    return state


def _paid_order(session, factory, area_id="salmiya", governorate="hawalli", locale="en") -> Order:
    variant_id = factory.product(stock=5).variants[0].id
    payload = SimpleNamespace(
        lines=[SimpleNamespace(variant_id=variant_id, quantity=2)],
        email="buyer@gmail.com",
        shipping_address=SimpleNamespace(
            country_code="KW", full_name="Abdullah Al Mutairi", phone="+96551234567",
            governorate_id=governorate, area_id=area_id, city=None, district=None, block="10",
            street="Salem Al Mubarak", building="24", extra_directions="Second floor, flat 5",
        ),
        shipping_method_id="express",
        payment_method_code="online",
        coupon_code=None,
    )
    order = checkout_service.create_order(session, payload, locale=locale)
    order.payment_status, order.status = "paid", "confirmed"
    session.commit()
    return order


def _address(session, order) -> OrderAddress:
    return session.execute(select(OrderAddress).where(OrderAddress.order_id == order.id)).scalar_one()


def test_the_area_is_matched_inside_its_governorate(session, factory):
    order = _paid_order(session, factory)
    assert shipping_service.suggest_area(_address(session, order), AREAS)["id"] == "area-salmiya-0000"


def test_an_arabic_order_still_finds_its_area(session, factory):
    order = _paid_order(session, factory, locale="ar")
    assert shipping_service.suggest_area(_address(session, order), AREAS)["id"] == "area-salmiya-0000"


def test_a_spelling_difference_is_matched_but_a_stranger_is_left_to_staff(session, factory):
    capital = _paid_order(session, factory, area_id="bneid-al-qar", governorate="capital")
    assert shipping_service.suggest_area(_address(session, capital), AREAS)["id"] == "area-bneid-000000"
    # Mishref is not in the stand-in list: no guess rather than a wrong one.
    elsewhere = _paid_order(session, factory, area_id="mishref", governorate="hawalli")
    assert shipping_service.suggest_area(_address(session, elsewhere), AREAS) is None


def test_the_preview_offers_the_express_service_for_an_express_order(session, factory, courier):
    order = _paid_order(session, factory)
    preview = shipping_service.preview(session, order.id)
    assert preview["default_service"] == "DE"
    assert preview["suggested_area_id"] == "area-salmiya-0000"
    assert preview["default_pieces"] == 2
    assert preview["shipment"] is None


def test_sending_books_prepaid_and_records_the_tracking_number(session, factory, courier):
    order = _paid_order(session, factory)

    shipment = shipping_service.send_order(
        session, order.id, service_code="DE", area_id="area-salmiya-0000", weight=Decimal("1.5"),
        pieces=2, description="2 x thobe", actor_user_id=None,
    )

    assert shipment.tracking_number == "PX00000001" and shipment.status == "created"
    sent = courier.booked[0]
    assert sent["refernce2"] == order.order_number
    assert sent["encryptedProductId"] == "svc-de"
    assert sent["shipmentAmount"]["codAmount"] == 0
    consignee = sent["shipmentConsignee"]["address"]
    assert consignee["encryptedAreaId"] == "area-salmiya-0000"
    assert consignee["cellNo"] == "+96551234567"
    assert sent["shipmentShipper"]["address"]["encryptedAreaId"] == "area-office"
    assert sent["shipmentDetail"]["weight"] == "1.500" and sent["shipmentDetail"]["pieces"] == 2


def test_an_order_is_sent_only_once(session, factory, courier):
    order = _paid_order(session, factory)
    args = dict(service_code="DS", area_id="area-salmiya-0000", weight=Decimal("1"), pieces=1,
                description="thobe", actor_user_id=None)
    shipping_service.send_order(session, order.id, **args)
    with pytest.raises(ConflictError):
        shipping_service.send_order(session, order.id, **args)
    assert len(courier.booked) == 1


def test_unpaid_and_foreign_orders_are_refused_before_porter_hears_of_them(session, factory, courier):
    unpaid = _paid_order(session, factory)
    unpaid.payment_status = "unpaid"
    session.commit()
    with pytest.raises(BusinessRuleError) as exc:
        shipping_service.send_order(session, unpaid.id, service_code="DS", area_id="area-salmiya-0000",
                                    weight=Decimal("1"), pieces=1, description="thobe", actor_user_id=None)
    assert exc.value.code == "order_not_paid"

    abroad = _paid_order(session, factory)
    _address(session, abroad).country_code = "SA"
    session.commit()
    with pytest.raises(BusinessRuleError) as exc:
        shipping_service.send_order(session, abroad.id, service_code="DS", area_id="area-salmiya-0000",
                                    weight=Decimal("1"), pieces=1, description="thobe", actor_user_id=None)
    assert exc.value.code == "outside_kuwait"
    assert courier.booked == []


def test_an_area_not_on_porters_list_is_refused(session, factory, courier):
    order = _paid_order(session, factory)
    with pytest.raises(BusinessRuleError) as exc:
        shipping_service.send_order(session, order.id, service_code="DS", area_id="made-up-area-id",
                                    weight=Decimal("1"), pieces=1, description="thobe", actor_user_id=None)
    assert exc.value.code == "invalid_area"


def test_delivery_marks_the_order_fulfilled(session, factory, courier):
    order = _paid_order(session, factory)
    shipment = shipping_service.send_order(
        session, order.id, service_code="DS", area_id="area-salmiya-0000", weight=Decimal("1"),
        pieces=1, description="thobe", actor_user_id=None,
    )
    courier.history = [{"awbNo": shipment.tracking_number, "shipmentStatusLogs": [
        {"statusCode": "NEW", "dateCreated": "2026-11-07T10:00:00"},
        {"statusCode": "OFD", "dateCreated": "2026-11-07T12:00:00"},
    ]}]
    assert shipping_service.refresh_status(session, shipment).status == "out_for_delivery"

    courier.history[0]["shipmentStatusLogs"].append({"statusCode": "DELIVERED", "dateCreated": "2026-11-07T15:00:00"})
    shipping_service.refresh_status(session, shipment)

    session.expire_all()
    assert shipment.status == "delivered" and shipment.delivered_at is not None
    assert session.get(Order, order.id).fulfilment_status == "fulfilled"
    # Delivered is final, so the background sync stops asking about it.
    assert "delivered" in shipping_service.FINAL_STATUSES


def test_a_porter_failure_books_nothing_locally(session, factory, courier, monkeypatch):
    order = _paid_order(session, factory)

    def refuse(_payload):
        raise porter.PorterError("Shipment/Save refused (400): Area is required")

    monkeypatch.setattr(porter, "create_shipment", refuse)
    with pytest.raises(BusinessRuleError) as exc:
        shipping_service.send_order(session, order.id, service_code="DS", area_id="area-salmiya-0000",
                                    weight=Decimal("1"), pieces=1, description="thobe", actor_user_id=None)
    assert exc.value.code == "porter_refused"
    session.rollback()
    assert session.execute(select(Shipment).where(Shipment.order_id == order.id)).first() is None
