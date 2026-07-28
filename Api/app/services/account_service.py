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

    customer = Customer(
        email=email,
        phone_e164=(data.phone or None),
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
