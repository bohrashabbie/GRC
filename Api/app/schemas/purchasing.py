from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class SupplierCreate(BaseModel):
    code: str
    name: str
    contact_name: str | None = None
    email: str | None = None
    phone_e164: str | None = None
    address: str | None = None
    vat_number: str | None = None
    currency: str = "SAR"
    payment_terms_days: int | None = None
    default_lead_time_days: int | None = None
    is_active: bool = True


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_name: str | None = None
    email: str | None = None
    phone_e164: str | None = None
    address: str | None = None
    vat_number: str | None = None
    payment_terms_days: int | None = None
    default_lead_time_days: int | None = None
    is_active: bool | None = None


class SupplierOut(BaseModel):
    id: int
    code: str
    name: str
    contact_name: str | None
    email: str | None
    phone_e164: str | None
    address: str | None
    vat_number: str | None
    currency: str
    payment_terms_days: int | None
    default_lead_time_days: int | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PurchaseOrderItemIn(BaseModel):
    variant_id: int
    qty_ordered: int = Field(gt=0)
    unit_cost: Decimal


class PurchaseOrderItemOut(BaseModel):
    id: int
    variant_id: int
    qty_ordered: int
    qty_received: int
    unit_cost: Decimal
    line_total: Decimal

    model_config = {"from_attributes": True}


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    destination_location_id: int
    currency: str = "SAR"
    exchange_rate: Decimal | None = None
    tax_total: Decimal = Decimal("0")
    shipping_cost: Decimal = Decimal("0")
    expected_at: date | None = None
    items: list[PurchaseOrderItemIn] = Field(min_length=1)


class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    destination_location_id: int
    status: str
    currency: str
    exchange_rate: Decimal | None
    subtotal: Decimal
    tax_total: Decimal
    shipping_cost: Decimal
    total: Decimal
    expected_at: date | None
    created_by_user_id: int
    approved_by_user_id: int | None
    approved_at: datetime | None
    created_at: datetime
    items: list[PurchaseOrderItemOut]

    model_config = {"from_attributes": True}


class GoodsReceiptItemIn(BaseModel):
    purchase_order_item_id: int | None = None
    variant_id: int
    qty: int = Field(ge=0)
    qty_rejected: int = 0
    unit_cost: Decimal | None = None


class GoodsReceiptItemOut(BaseModel):
    id: int
    purchase_order_item_id: int | None
    variant_id: int
    qty: int
    qty_rejected: int
    unit_cost: Decimal | None

    model_config = {"from_attributes": True}


class GoodsReceiptCreate(BaseModel):
    purchase_order_id: int | None = None
    location_id: int
    supplier_invoice_number: str | None = None
    note: str | None = None
    items: list[GoodsReceiptItemIn] = Field(min_length=1)


class GoodsReceiptOut(BaseModel):
    id: int
    receipt_number: str
    purchase_order_id: int | None
    location_id: int
    supplier_invoice_number: str | None
    received_by_user_id: int
    received_at: datetime
    note: str | None
    items: list[GoodsReceiptItemOut]

    model_config = {"from_attributes": True}
