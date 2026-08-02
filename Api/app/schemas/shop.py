"""Public storefront request bodies. Read-only shop projections are built as
plain dicts in shop_service; these are the shapes the browser POSTs, which do
need validating."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class CheckoutLineIn(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, le=99)


class CheckoutAddressIn(BaseModel):
    """A Kuwaiti delivery address: Governorate → Area → Block → Street →
    Building. No postal code and no national short code — Kuwait uses neither
    for delivery, and asking for them was friction with no payoff.

    The client sends governorate/area *slugs*; the names are resolved
    server-side so the order snapshot cannot be given a label that does not
    match the code it was picked from.
    """

    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    governorate_id: str = Field(min_length=2, max_length=40)
    area_id: str = Field(min_length=2, max_length=60)
    block: str = Field(min_length=1, max_length=20)
    street: str = Field(min_length=1, max_length=120)
    building: str = Field(min_length=1, max_length=60)
    # Floor / flat / extra directions, one free-text line.
    extra_directions: str | None = Field(default=None, max_length=200)


class CheckoutIn(BaseModel):
    """What the browser may say about an order: which variants, how many, and
    where to send it. Deliberately no prices — every figure is computed
    server-side in checkout_service."""

    lines: list[CheckoutLineIn] = Field(min_length=1)
    email: EmailStr
    shipping_address: CheckoutAddressIn
    shipping_method_id: str
    # Widened again when a gateway lands; checkout_service holds the
    # authoritative allowlist of what can actually complete today.
    payment_method_code: Literal["mada", "card", "apple_pay", "tamara", "cod"] = "cod"


class CheckoutTotalsOut(BaseModel):
    subtotal: Decimal
    discount_total: Decimal
    shipping_total: Decimal
    tax_total: Decimal
    grand_total: Decimal


class CheckoutOut(BaseModel):
    order_number: str
    status: str
    payment_status: str
    email: str | None
    totals: CheckoutTotalsOut


class ContactIn(BaseModel):
    """The Contact Us form. Lengths are tight enough that the unauthenticated
    endpoint is a poor spam target without cutting off a genuine complaint
    mid-sentence."""

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    subject: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=10, max_length=4000)


class StockCheckIn(BaseModel):
    variant_ids: list[int] = Field(min_length=1, max_length=100)


class VariantStockOut(BaseModel):
    variant_id: int
    quantity: int
    stock_state: str
    """Null when the product is not inventory-tracked, i.e. no ceiling at all."""
    max_quantity: int | None


# --------------------------------------------------------------------------
# Customer accounts
# --------------------------------------------------------------------------

class RegisterIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    # Validated for length in the service, not here, so the failure comes back
    # as a branchable code rather than a Pydantic field error.
    password: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=20)
    locale: str | None = None
    accepts_marketing: bool = False


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class CustomerOut(BaseModel):
    id: int
    email: str | None
    first_name: str | None
    last_name: str | None
    phone: str | None = None

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    """The token is returned in the body so the storefront's route handler can
    put it in an httpOnly cookie. It is never handed to browser JavaScript."""

    token: str
    customer: CustomerOut


class WishlistOut(BaseModel):
    product_ids: list[int]


class ProfileUpdateIn(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=1, max_length=200)


class AccountOrderOut(BaseModel):
    id: str
    order_number: str
    status: str
    placed_at: datetime
    item_count: int
    grand_total: Decimal


class AccountSummaryOut(BaseModel):
    """Counts for the account landing page, so each card says how much is
    behind it rather than repeating a static description."""

    order_count: int
    wishlist_count: int
    address_count: int
