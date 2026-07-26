from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class OrderAddressOut(BaseModel):
    type: str
    recipient_name: str
    phone_e164: str
    line1: str
    line2: str | None
    district: str | None
    city: str
    region_name: str
    postal_code: str | None
    country_code: str

    model_config = {"from_attributes": True}


class OrderItemOut(BaseModel):
    id: int
    variant_id: int
    product_id: int
    sku_snapshot: str
    name_snapshot: str
    options_snapshot: dict
    unit_price_snapshot: Decimal
    tax_rate_snapshot: Decimal
    qty: int
    qty_fulfilled: int
    qty_returned: int
    line_total: Decimal

    model_config = {"from_attributes": True}


class OrderNoteIn(BaseModel):
    body: str = Field(min_length=1)
    is_customer_visible: bool = False


class OrderNoteOut(BaseModel):
    id: int
    author_user_id: int | None
    body: str
    is_customer_visible: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderStatusHistoryOut(BaseModel):
    field: str
    from_value: str | None
    to_value: str
    actor_type: str
    actor_user_id: int | None
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    field: str = Field(description="status | payment_status | fulfilment_status")
    to_value: str
    reason: str | None = None


class PaymentOut(BaseModel):
    id: int
    provider: str
    method: str | None
    amount: Decimal
    currency: str
    status: str
    captured_at: datetime | None
    created_at: datetime
    # Computed in order_service.get_order — sum of succeeded refunds against
    # this payment, so the admin knows how much is still refundable.
    refunded_amount: Decimal = Decimal("0")

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    order_number: str
    customer_id: int | None
    email: str | None
    phone_e164: str | None
    status: str
    payment_status: str
    fulfilment_status: str
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    shipping_total: Decimal
    tax_total: Decimal
    grand_total: Decimal
    locale: str
    placed_at: datetime
    cancelled_at: datetime | None
    cancel_reason: str | None
    items: list[OrderItemOut] = []
    addresses: list[OrderAddressOut] = []
    notes: list[OrderNoteOut] = []
    payments: list[PaymentOut] = []

    model_config = {"from_attributes": True}


class RefundRequest(BaseModel):
    payment_id: int
    amount: Decimal = Field(gt=0)
    reason: str | None = None


class PaymentRefundOut(BaseModel):
    id: int
    payment_id: int
    order_id: int
    amount: Decimal
    reason: str | None
    status: str
    created_by_user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
