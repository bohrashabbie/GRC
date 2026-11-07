"""Sending orders to Porter Express and keeping their delivery status current.

Staff send each order by hand from the admin: a courier booking is a real-world
action, so nothing books one automatically. The admin shows the matched Porter
area first and staff can change it, because Porter's area names are spelled
differently from ours (BNEID AL GAR, Bneid Al Qar) and a wrong guess would
send the driver to the wrong place.
"""

from __future__ import annotations

import difflib
import logging
import re
import threading
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import kuwait, porter
from app.database import SessionLocal
from app.middleware.error import BusinessRuleError, ConflictError, NotFoundError
from app.models.catalog import Carrier
from app.models.orders import Order, OrderAddress, OrderItem, Shipment
from app.services import audit_service, inventory_service

log = logging.getLogger(__name__)

CARRIER_CODE = "porter"
#: GR8's delivery options and the Porter service each one books.
SERVICE_FOR_METHOD = {"standard": "DS", "express": "DE"}
OFFERED_SERVICES = ("DS", "DE", "DF")
_SYNC_EVERY_SECONDS = 1800

# Porter writes the governorate before the area: "HAWALLY-SALMIYA".
_PORTER_GOVERNORATE = {
    "capital": "KUWAIT CITY",
    "hawalli": "HAWALLY",
    "farwaniya": "FARWANIYA",
    "mubarak-al-kabeer": "MUBARAK AL KABIR",
    "ahmadi": "AHMADI",
    "jahra": "JAHRA",
}

# Porter status code -> GR8 shipment status. Anything unlisted is in transit.
_STATUS = {
    "NEW": "created",
    "OFD": "out_for_delivery",
    "DISPATCH": "out_for_delivery",
    "DELIVERED": "delivered",
    "RTO": "returning",
    "RTW": "returning",
    "RF": "returning",
    "RTC": "returned",
    "STKRTN": "returned",
    "VOID": "cancelled",
    "PCXL": "cancelled",
}
FINAL_STATUSES = {"delivered", "returned", "cancelled"}


def _norm(text: str) -> str:
    words = re.sub(r"[^A-Z ]", " ", (text or "").upper()).split()
    return "".join(w for w in words if w not in ("AL", "EL"))


def _kuwait_area(order_address: OrderAddress) -> tuple[str, str] | None:
    """(governorate code, area name in English) for the order's address. The
    order keeps names in the shopper's language, so look them up both ways."""
    for gov_code, _gov_en, _gov_ar, areas in kuwait.GOVERNORATES:
        for _area_code, area_en, area_ar in areas:
            if order_address.city in (area_en, area_ar):
                return gov_code, area_en
    return None


def suggest_area(order_address: OrderAddress, porter_areas: list[dict]) -> dict | None:
    """Best Porter area for the order, or None when nothing is close enough —
    then staff pick it. Matching stays inside the governorate, so two areas that
    share a name in different governorates are never confused."""
    found = _kuwait_area(order_address)
    if found is None:
        return None
    gov_code, area_en = found
    prefix = _PORTER_GOVERNORATE.get(gov_code)
    pool = {
        _norm(a["name"].split("-", 1)[1]): a
        for a in porter_areas
        if "-" in a["name"] and a["name"].split("-", 1)[0] == prefix
    }
    key = _norm(area_en)
    if key in pool:
        return pool[key]
    close = difflib.get_close_matches(key, list(pool), n=1, cutoff=0.8)
    return pool[close[0]] if close else None


def _shipping_address(db: Session, order_id: int) -> OrderAddress:
    address = db.execute(
        select(OrderAddress).where(OrderAddress.order_id == order_id, OrderAddress.type == "shipping")
    ).scalar_one_or_none()
    if address is None:
        raise BusinessRuleError("This order has no delivery address.", code="no_delivery_address")
    return address


def latest_shipment(db: Session, order_id: int) -> Shipment | None:
    return db.execute(
        select(Shipment).where(Shipment.order_id == order_id).order_by(Shipment.id.desc())
    ).scalars().first()


def _get_order(db: Session, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise NotFoundError("Order not found")
    return order


def preview(db: Session, order_id: int) -> dict:
    """What the admin's send form needs: services, areas, and our best guesses."""
    order = _get_order(db, order_id)
    shipment = latest_shipment(db, order_id)
    result = {"enabled": porter.is_enabled(), "shipment": shipment_out(shipment)}
    if not porter.is_enabled() or (shipment and shipment.status != "cancelled"):
        return result
    address = _shipping_address(db, order_id)
    try:
        porter_areas = porter.areas()
        porter_services = porter.services()
    except porter.PorterError as exc:
        raise BusinessRuleError(f"Porter Express could not be reached: {exc}", code="porter_unavailable") from exc
    suggested = suggest_area(address, porter_areas)
    items = db.execute(select(OrderItem).where(OrderItem.order_id == order_id)).scalars().all()
    pieces = sum(item.qty for item in items) or 1
    result.update(
        {
            "is_kuwait": address.country_code == "KW",
            "services": [
                {"code": code, "name": porter_services[code]["name"]} for code in OFFERED_SERVICES if code in porter_services
            ],
            "default_service": SERVICE_FOR_METHOD.get(order.shipping_method_code or "", "DS"),
            "areas": sorted(porter_areas, key=lambda a: a["name"]),
            "suggested_area_id": suggested["id"] if suggested else None,
            "default_pieces": pieces,
            "default_weight": "1.000",
            "default_description": ", ".join(f"{i.qty} x {i.name_snapshot}" for i in items)[:50] or "Clothing",
        }
    )
    return result


def _phone(raw: str) -> str:
    digits = "".join(ch for ch in raw or "" if ch.isdigit() or ch == "+")
    if len(digits) == 8:  # a Kuwaiti number typed without its code
        digits = "+965" + digits
    return digits[:15]


def build_payload(order: Order, address: OrderAddress, *, account: dict, service_id: str, area_id: str,
                  weight: Decimal, pieces: int, description: str) -> dict:
    """The shipment in the shape Porter's own portal sends. Paid online in
    advance, so nothing is collected on delivery (codAmount 0)."""
    phone = _phone(address.phone_e164)
    street = ", ".join(p for p in (address.district, address.line1) if p)
    receiver = {
        "encryptedId": "",
        "contactPerson": address.recipient_name[:100],
        "name": address.recipient_name[:100],
        "description": f"{address.city}, {street}"[:250],
        "landMark": (address.line2 or "")[:100],
        "phone": phone,
        "cellNo": phone,
        "countryCode": "KW",
        "encryptedCityId": "",
        "encryptedAreaId": area_id,
    }
    pickup = account["pickup_address"]
    shipper = {
        "encryptedId": "",
        "contactPerson": pickup.get("contactPerson") or "",
        "name": pickup.get("name") or "",
        "description": pickup.get("description") or "",
        "landMark": pickup.get("landMark") or "",
        "phone": pickup.get("phone") or pickup.get("cellNo") or "",
        "cellNo": pickup.get("cellNo") or "",
        "countryCode": pickup.get("countryCode") or "KW",
        "encryptedCityId": pickup.get("encryptedCityId") or "",
        "encryptedAreaId": pickup.get("encryptedAreaId") or "",
    }
    return {
        "encryptedId": "",
        "isDeadShipment": False,
        "awbNo": "",
        "refernce2": order.order_number,  # sic: Porter's spelling
        "encryptedProductId": service_id,
        "encryptedBranchId": account["branch_id"],
        "encryptedCustomerId": account["customer_id"],
        "pickupNo": "",
        "enablePickUp": False,
        "encryptedCustomerBrandId": "",
        "pickup": None,
        "shipmentAmount": {
            "shipperPayType": None,
            "goodsCost": float(order.grand_total),
            "goodsCostCurrencyCode": "KWD",
            "codAmount": 0,
            "codCurrencyCode": None,
            "customDuty": 0,
            "customDutyCurrency": None,
            "deliveryCharges": 0,
            "customFeesType": None,
            "clearenceFeesType": None,
        },
        "shipmentDetail": {
            "encryptedId": "",
            "pieces": pieces,
            "weight": f"{weight:.3f}",
            "volumetricWeight": None,
            "length": None,
            "width": None,
            "height": None,
            "measurementType": None,
            "shipmentType": 1,  # non-documents
            "roundTrip": False,
            "description1": description[:50],
            "description2": "",
            "notes1": (address.line2 or "")[:100],
            "notes2": "",
            "notes3": "",
            "notes4": "",
            "parentAwbNo": "",
            "transportMode": None,
        },
        "packages": [
            {
                "encryptedId": None,
                "awbNo": None,
                "packageDescription": description[:100],
                "actualWeight": float(weight),
                "length": None,
                "width": None,
                "height": None,
                "volumetricWeight": None,
                "measurementType": None,
                "codAmount": None,
                "codCurrencyCode": None,
                "goodsCost": None,
                "goodsCostCurrencyCode": None,
                "shipperPayType": None,
                "stockInDetails": [],
            }
        ],
        "shipmentShipper": {"encryptedId": "", "reference1": "", "address": shipper},
        "shipmentConsignee": {
            "encryptedId": "",
            "company": "",
            "name": address.recipient_name[:100],
            "encryptedDesignationId": None,
            "remarks": "",
            "civilId": "",
            "nationalIDType": "",
            "email": order.email or "",
            "paciNo": "",
            "encryptedSegmentId": None,
            "address": receiver,
        },
        "shipmentDocuments": [],
        "stockInDetails": [],
    }


def _carrier(db: Session) -> Carrier:
    carrier = db.execute(select(Carrier).where(Carrier.code == CARRIER_CODE)).scalar_one_or_none()
    if carrier is None:
        carrier = Carrier(code=CARRIER_CODE, name_en="Porter Express", name_ar="بورتر إكسبريس", is_active=True)
        db.add(carrier)
        db.flush()
    return carrier


def send_order(db: Session, order_id: int, *, service_code: str, area_id: str, weight: Decimal, pieces: int,
               description: str, actor_user_id: int) -> Shipment:
    """Book the order with Porter Express and record the shipment."""
    if not porter.is_enabled():
        raise BusinessRuleError("Porter Express is not connected.", code="porter_disabled")
    order = _get_order(db, order_id)
    if order.status == "cancelled":
        raise BusinessRuleError("This order is cancelled.", code="order_cancelled")
    if order.payment_status not in ("paid", "partially_refunded"):
        raise BusinessRuleError("Only paid orders can be sent for delivery.", code="order_not_paid")
    existing = latest_shipment(db, order_id)
    if existing is not None and existing.status != "cancelled":
        raise ConflictError(
            f"This order was already sent (tracking {existing.tracking_number}).", code="already_shipped"
        )
    address = _shipping_address(db, order_id)
    if address.country_code != "KW":
        raise BusinessRuleError(
            "Porter Express delivers inside Kuwait only; send this order another way.", code="outside_kuwait"
        )
    if service_code not in OFFERED_SERVICES:
        raise BusinessRuleError("Choose a Porter service.", code="invalid_service")

    try:
        account = porter.account()
        service = porter.services().get(service_code)
        if service is None:
            raise BusinessRuleError("That service is not on this Porter account.", code="invalid_service")
        if area_id not in {a["id"] for a in porter.areas()}:
            raise BusinessRuleError("Choose the delivery area from Porter's list.", code="invalid_area")
        payload = build_payload(order, address, account=account, service_id=service["id"], area_id=area_id,
                                weight=weight, pieces=pieces, description=description)
        booked = porter.create_shipment(payload)
    except porter.PorterError as exc:
        log.error("order %s: Porter booking failed: %s", order.order_number, exc)
        raise BusinessRuleError(f"Porter Express refused the booking: {exc}", code="porter_refused") from exc

    shipment = Shipment(
        order_id=order.id,
        carrier_id=_carrier(db).id,
        from_location_id=inventory_service.ensure_default_online_location(db),
        tracking_number=str(booked["awbNo"]),
        status="created",
        shipped_at=datetime.now(timezone.utc),
    )
    db.add(shipment)
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="order.shipment_created",
        entity_type="order",
        entity_id=order.id,
        after={"carrier": CARRIER_CODE, "tracking_number": shipment.tracking_number, "service": service_code},
    )
    db.commit()
    db.refresh(shipment)
    return shipment


def _latest_status_code(history: list[dict]) -> str | None:
    """Porter's current status code from a tracking reply. Each entry may carry
    its logs; the newest log, by date, wins."""
    logs = []
    for entry in history:
        logs.extend(entry.get("shipmentStatusLogs") or entry.get("logs") or [])
        code = entry.get("statusCode") or entry.get("shipmentStatusCode")
        if code and not logs:
            return code
    dated = [l for l in logs if l.get("statusCode") or l.get("code")]
    if not dated:
        return None
    dated.sort(key=lambda l: str(l.get("dateCreated") or l.get("date") or ""))
    return dated[-1].get("statusCode") or dated[-1].get("code")


def refresh_status(db: Session, shipment: Shipment) -> Shipment:
    """Ask Porter where the parcel is and record it. A delivered parcel marks
    the order fulfilled; anything Porter cannot answer leaves things as they are."""
    try:
        code = _latest_status_code(porter.tracking(shipment.tracking_number))
    except porter.PorterError as exc:
        log.warning("shipment %s: status not refreshed: %s", shipment.tracking_number, exc)
        return shipment
    status = _STATUS.get(code or "", "in_transit" if code else shipment.status)
    if status == shipment.status:
        return shipment
    before = shipment.status
    shipment.status = status
    if status == "delivered":
        shipment.delivered_at = datetime.now(timezone.utc)
        order = db.get(Order, shipment.order_id)
        if order is not None and order.fulfilment_status in ("unfulfilled", "partially_fulfilled"):
            order.fulfilment_status = "fulfilled"
    audit_service.record(
        db,
        actor_user_id=None,
        actor_type="system",
        action="order.shipment_status",
        entity_type="order",
        entity_id=shipment.order_id,
        before={"shipment_status": before},
        after={"shipment_status": status, "porter_code": code},
    )
    db.commit()
    return shipment


def label(db: Session, order_id: int) -> str:
    shipment = latest_shipment(db, order_id)
    if shipment is None or not shipment.tracking_number:
        raise NotFoundError("This order has not been sent to Porter Express.")
    try:
        return porter.label_html([shipment.tracking_number])
    except porter.PorterError as exc:
        raise BusinessRuleError(f"Porter Express could not produce the label: {exc}", code="porter_unavailable") from exc


def shipment_out(shipment: Shipment | None) -> dict | None:
    if shipment is None:
        return None
    return {
        "id": shipment.id,
        "tracking_number": shipment.tracking_number,
        "status": shipment.status,
        "shipped_at": shipment.shipped_at,
        "delivered_at": shipment.delivered_at,
    }


def sync_active(db: Session) -> int:
    """Refresh every Porter shipment still on its way."""
    carrier = db.execute(select(Carrier).where(Carrier.code == CARRIER_CODE)).scalar_one_or_none()
    if carrier is None:
        return 0
    active = db.execute(
        select(Shipment).where(Shipment.carrier_id == carrier.id, Shipment.status.not_in(FINAL_STATUSES))
    ).scalars().all()
    for shipment in active:
        try:
            refresh_status(db, shipment)
        except Exception:  # noqa: BLE001 - one bad reply must not stop the rest
            db.rollback()
            log.exception("shipment %s: sync failed", shipment.tracking_number)
    return len(active)


def start_sync() -> threading.Event:
    """Keep delivery statuses current without staff pressing anything."""
    stop = threading.Event()

    def run() -> None:
        while not stop.wait(_SYNC_EVERY_SECONDS):
            try:
                with SessionLocal() as db:
                    sync_active(db)
            except Exception:  # noqa: BLE001
                log.exception("shipment sync failed")

    threading.Thread(target=run, name="shipment-sync", daemon=True).start()
    return stop
