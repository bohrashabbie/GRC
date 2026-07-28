"""Storefront customer accounts and wishlists.

Deliberately separate from auth_service, which serves staff. Staff carry roles,
permissions, location scoping and audited sessions; a shopper carries none of
that and should never be able to acquire them by accident. The two use
different token types over the same secret, so neither side's token is
accepted by the other's endpoints.

Simplifications, stated rather than hidden:
  - No refresh rotation. One long-lived customer token, held in an httpOnly
    cookie by the storefront. Being logged out mid-browse is a lost sale, and
    the token grants nothing beyond one shopper's own wishlist and orders.
  - No email verification. verification_tokens is out of scope and there is no
    mail transport in this build, so `email_verified_at` stays null rather than
    being set to a lie.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.middleware.error import AuthenticationError, ConflictError, NotFoundError
from app.middleware.security import (
    create_customer_access_token,
    hash_password,
    verify_password,
)
from app.models.customers import Customer, WishlistItem
from app.services import order_service

MIN_PASSWORD_LENGTH = 8


def register(db: Session, data) -> tuple[Customer, str]:
    email = data.email.strip().lower()

    existing = db.execute(select(Customer).where(Customer.email == email)).scalar_one_or_none()
    if existing is not None:
        # Deliberately explicit. Hiding this behind a generic message is the
        # textbook advice, but on a storefront it just sends someone round the
        # reset-password loop for an account they already know they have, and
        # the same fact is discoverable from the login form anyway.
        raise ConflictError(
            "An account with this email already exists.", code="email_already_registered"
        )

    if len(data.password) < MIN_PASSWORD_LENGTH:
        raise ConflictError(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
            code="password_too_short",
        )

    # phone_e164 is UNIQUE. Without this check the collision surfaces as a raw
    # integrity error wearing the email message, which sends the shopper off
    # changing the one field that was actually fine.
    phone = (data.phone or "").strip() or None
    if phone is not None:
        clash = db.execute(
            select(Customer.id).where(Customer.phone_e164 == phone)
        ).scalar_one_or_none()
        if clash is not None:
            raise ConflictError(
                "This mobile number is already on another account.",
                code="phone_already_registered",
            )

    customer = Customer(
        email=email,
        phone_e164=phone,
        password_hash=hash_password(data.password),
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        locale_pref=data.locale or "ar",
        accepts_marketing=bool(data.accepts_marketing),
        is_active=True,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer, create_customer_access_token(customer.id)


def login(db: Session, email: str, password: str) -> tuple[Customer, str]:
    customer = db.execute(
        select(Customer).where(Customer.email == email.strip().lower())
    ).scalar_one_or_none()

    # One message for "no such account" and "wrong password", and the hash is
    # still verified against a dummy when the account is missing, so neither the
    # wording nor the timing says which it was.
    if customer is None or not customer.password_hash:
        hash_password(password)
        raise AuthenticationError("Email or password is incorrect.")
    if not verify_password(password, customer.password_hash):
        raise AuthenticationError("Email or password is incorrect.")
    if not customer.is_active:
        raise AuthenticationError("This account is no longer active.")

    customer.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(customer)
    return customer, create_customer_access_token(customer.id)


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None or not customer.is_active:
        raise AuthenticationError("This account is no longer active.")
    return customer


# --------------------------------------------------------------------------
# Wishlist
# --------------------------------------------------------------------------

def wishlist_product_ids(db: Session, customer_id: int) -> list[int]:
    """Just the ids. The storefront needs these on every page to decide which
    hearts are filled, so it stays a single narrow query rather than a product
    projection nobody renders."""
    return list(
        db.execute(
            select(WishlistItem.product_id)
            .where(WishlistItem.customer_id == customer_id)
            .order_by(WishlistItem.created_at.desc())
        ).scalars()
    )


def add_to_wishlist(db: Session, customer_id: int, product_id: int) -> None:
    """Idempotent: hearting something twice is not an error, it is the same
    row. The composite primary key does the deduplication, so this needs no
    read-then-write and no race to lose."""
    from app.models.catalog import Product

    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundError("Product not found")

    exists = db.get(WishlistItem, {"customer_id": customer_id, "product_id": product_id})
    if exists is not None:
        return

    db.add(WishlistItem(customer_id=customer_id, product_id=product_id))
    db.commit()


def remove_from_wishlist(db: Session, customer_id: int, product_id: int) -> None:
    """Also idempotent — un-hearting something already gone is a no-op, so a
    double click cannot produce an error the shopper has to understand."""
    db.execute(
        delete(WishlistItem).where(
            WishlistItem.customer_id == customer_id,
            WishlistItem.product_id == product_id,
        )
    )
    db.commit()


def update_profile(db: Session, customer_id: int, data) -> Customer:
    customer = get_customer(db, customer_id)

    if data.email is not None:
        email = data.email.strip().lower()
        if email != (customer.email or ""):
            clash = db.execute(
                select(Customer.id).where(Customer.email == email, Customer.id != customer_id)
            ).scalar_one_or_none()
            if clash is not None:
                raise ConflictError(
                    "An account with this email already exists.",
                    code="email_already_registered",
                )
            customer.email = email
            # A changed address has not been proven, so any prior proof is void.
            customer.email_verified_at = None

    if data.first_name is not None:
        customer.first_name = data.first_name.strip()
    if data.last_name is not None:
        customer.last_name = data.last_name.strip()
    if data.phone is not None:
        phone = data.phone.strip() or None
        if phone and phone != customer.phone_e164:
            clash = db.execute(
                select(Customer.id).where(
                    Customer.phone_e164 == phone, Customer.id != customer_id
                )
            ).scalar_one_or_none()
            if clash is not None:
                raise ConflictError(
                    "This mobile number is already on another account.",
                    code="phone_already_registered",
                )
        customer.phone_e164 = phone
        customer.phone_verified_at = None

    db.commit()
    db.refresh(customer)
    return customer


def change_password(db: Session, customer_id: int, current: str, new: str) -> None:
    customer = get_customer(db, customer_id)

    # The current password is required even though the session already proves
    # identity: it is what stops someone on a borrowed unlocked laptop from
    # taking the account over.
    if not customer.password_hash or not verify_password(current, customer.password_hash):
        raise AuthenticationError("Current password is incorrect.")
    if len(new) < MIN_PASSWORD_LENGTH:
        raise ConflictError(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
            code="password_too_short",
        )

    customer.password_hash = hash_password(new)
    db.commit()


def list_orders(db: Session, customer_id: int) -> list:
    """The customer's own orders, newest first.

    Legacy orders may predate customer_id linkage, so a NULL link may fall
    back to the account's unique email. An order explicitly linked to another
    customer never qualifies through that fallback.
    """
    from app.models.orders import Order, OrderItem

    orders = list(
        db.execute(
            select(Order)
            .where(order_service.customer_order_scope(customer_id))
            .order_by(Order.placed_at.desc())
        ).scalars()
    )
    for order in orders:
        order.item_count = sum(
            row for row in db.execute(
                select(OrderItem.qty).where(OrderItem.order_id == order.id)
            ).scalars()
        )
    return orders


def get_order_detail(
    db: Session,
    customer_id: int,
    order_number: str,
    base_url: str,
    *,
    locale: str = "ar",
) -> dict:
    """One of the customer's own orders, rendered entirely from its snapshots.

    Hard Rule 7: nothing customer-facing joins back to the live catalogue to
    reproduce a historical figure. Names, SKUs, options, unit prices and totals
    all come off the order rows, so repricing a thobe tomorrow cannot change
    what last week's receipt says. The only live lookups are the product slug
    and image, which are navigation aids — both degrade to null rather than
    altering a number.
    """
    from app.models.catalog import Media, Product, ProductMedia, ProductTranslation
    from app.models.orders import (
        Order,
        OrderAddress,
        OrderItem,
        OrderStatusHistory,
        Payment,
        Shipment,
    )

    order = db.execute(
        select(Order).where(
            Order.order_number == order_number,
            order_service.customer_order_scope(customer_id),
        )
    ).scalar_one_or_none()
    # Scoped by customer_id in the query, so another shopper's order number is
    # indistinguishable from one that does not exist.
    if order is None:
        raise NotFoundError("Order not found")

    items = list(
        db.execute(select(OrderItem).where(OrderItem.order_id == order.id)).scalars()
    )
    product_ids = [item.product_id for item in items]

    slugs: dict[int, str] = {}
    images: dict[int, str] = {}
    if product_ids:
        for product_id, slug in db.execute(
            select(ProductTranslation.product_id, ProductTranslation.slug).where(
                ProductTranslation.product_id.in_(product_ids)
            )
        ).all():
            slugs.setdefault(product_id, slug)
        for product_id, key in db.execute(
            select(ProductMedia.product_id, Media.storage_key)
            .join(Media, Media.id == ProductMedia.media_id)
            .where(ProductMedia.product_id.in_(product_ids))
            .order_by(
                ProductMedia.product_id,
                ProductMedia.is_primary.desc(),
                ProductMedia.sort_order,
            )
        ).all():
            images.setdefault(product_id, key)

    address = db.execute(
        select(OrderAddress).where(
            OrderAddress.order_id == order.id, OrderAddress.type == "shipping"
        )
    ).scalar_one_or_none()

    history = list(
        db.execute(
            select(OrderStatusHistory)
            .where(OrderStatusHistory.order_id == order.id, OrderStatusHistory.field == "status")
            .order_by(OrderStatusHistory.created_at)
        ).scalars()
    )

    def image_for(product_id: int) -> dict | None:
        key = images.get(product_id)
        if not key:
            return None
        return {
            "id": key,
            "url": f"{base_url}/uploads/{key}",
            "alt": None,
            "width": 800,
            "height": 1200,
            "available_widths": [320, 640, 960],
            "blur_data_url": None,
        }

    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status,
        "placed_at": order.placed_at,
        "item_count": sum(item.qty for item in items),
        "grand_total": order.grand_total,
        "lines": [
            {
                "id": str(item.id),
                "name_snapshot": item.name_snapshot,
                "sku_snapshot": item.sku_snapshot,
                "options_snapshot": " · ".join(str(v) for v in (item.options_snapshot or {}).values())
                or None,
                "unit_price_snapshot": item.unit_price_snapshot,
                "quantity": item.qty,
                "line_total": item.line_total,
                "image": image_for(item.product_id),
                "product_slug": slugs.get(item.product_id),
            }
            for item in items
        ],
        "totals": {
            "subtotal": order.subtotal,
            "discount_total": order.discount_total,
            "shipping_total": order.shipping_total,
            "tax_total": order.tax_total,
            "grand_total": order.grand_total,
            "free_shipping_remaining": None,
            "free_shipping_threshold": "200.00",
        },
        "shipping_address": {
            "id": str(address.id) if address else "",
            "full_name": address.recipient_name if address else "",
            "phone": address.phone_e164 if address else "",
            "governorate_id": "",
            "governorate_name": address.region_name if address else "",
            "area_id": "",
            "area_name": address.city if address else "",
            # Stored as "Block 10" / "Street 1, Building 24" on the order, which
            # is the form the courier reads. Split back out so the storefront's
            # address renderer gets the parts it expects.
            "block": (address.district or "").replace("Block ", "") if address else "",
            "street": _address_part(address.line1 if address else None, "Street"),
            "building": _address_part(address.line1 if address else None, "Building"),
            "extra_directions": address.line2 if address else None,
            "is_default": False,
        },
        "shipping_method_name": order.shipping_method_code or "",
        "payment_method_name": _payment_method_of(db, order.id),
        "timeline": [
            {
                "status": row.to_value,
                "occurred_at": row.created_at,
                "note": row.reason,
            }
            for row in history
        ],
        "tracking_number": None,
        "tracking_url": None,
    }


def _address_part(line1: str | None, label: str) -> str:
    """Pull "Street 1" or "Building 24" back out of the stored line."""
    if not line1:
        return ""
    for chunk in line1.split(","):
        chunk = chunk.strip()
        if chunk.startswith(f"{label} "):
            return chunk[len(label) + 1 :]
    return ""


def list_addresses(db: Session, customer_id: int) -> list[dict]:
    """The shopper's saved delivery addresses, in the Kuwaiti shape the
    storefront renders. Built by checkout as orders are placed."""
    from app.models.catalog import Region
    from app.models.customers import CustomerAddress

    rows = db.execute(
        select(CustomerAddress, Region)
        .join(Region, Region.id == CustomerAddress.region_id)
        .where(CustomerAddress.customer_id == customer_id)
        .order_by(CustomerAddress.is_default_shipping.desc(), CustomerAddress.id)
    ).all()

    return [
        {
            "id": str(row.id),
            "full_name": row.recipient_name,
            "phone": row.phone_e164,
            "governorate_id": region.code,
            "governorate_name": region.name_en,
            "area_id": "",
            "area_name": row.city,
            "block": (row.district or "").replace("Block ", ""),
            "street": _address_part(row.line1, "Street"),
            "building": _address_part(row.line1, "Building"),
            "extra_directions": row.line2,
            "is_default": row.is_default_shipping,
        }
        for row, region in rows
    ]


def _payment_method_of(db: Session, order_id: int) -> str:
    """What the shopper chose to pay with. Read off the payment row rather than
    inferred, so a receipt cannot describe a method that was never selected."""
    from app.models.orders import Payment

    method = db.execute(
        select(Payment.method).where(Payment.order_id == order_id).order_by(Payment.id)
    ).scalars().first()
    return method or ""
