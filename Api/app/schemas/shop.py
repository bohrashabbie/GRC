"""Public storefront request bodies. Read-only shop projections are built as
plain dicts in shop_service; these are the shapes the browser POSTs, which do
need validating."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class CheckoutLineIn(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, le=99)


class CheckoutAddressIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    street: str = Field(min_length=3, max_length=200)
    district: str = Field(min_length=2, max_length=120)
    city_name: str = Field(min_length=2, max_length=120)
    region_name: str = Field(min_length=2, max_length=120)
    building_number: str | None = None
    short_address: str | None = Field(default=None, max_length=8)
    postal_code: str | None = Field(default=None, max_length=12)
    additional_number: str | None = None


class CheckoutIn(BaseModel):
    """What the browser may say about an order: which variants, how many, and
    where to send it. Deliberately no prices — every figure is computed
    server-side in checkout_service."""

    lines: list[CheckoutLineIn] = Field(min_length=1)
    email: EmailStr
    shipping_address: CheckoutAddressIn
    shipping_method_id: str
    payment_method_code: Literal["mada", "card", "apple_pay", "tamara", "cod"] = "mada"


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


class StockCheckIn(BaseModel):
    variant_ids: list[int] = Field(min_length=1, max_length=100)


class VariantStockOut(BaseModel):
    variant_id: int
    quantity: int
    stock_state: str
    """Null when the product is not inventory-tracked, i.e. no ceiling at all."""
    max_quantity: int | None
