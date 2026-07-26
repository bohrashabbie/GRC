from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class LocationCreate(BaseModel):
    code: str
    type: str = Field(description="warehouse | store | virtual")
    name_ar: str
    name_en: str
    is_sellable_online: bool = True
    fulfilment_priority: int = 0
    is_active: bool = True


class LocationUpdate(BaseModel):
    name_ar: str | None = None
    name_en: str | None = None
    is_sellable_online: bool | None = None
    fulfilment_priority: int | None = None
    is_active: bool | None = None


class LocationOut(BaseModel):
    id: int
    code: str
    type: str
    name_ar: str
    name_en: str
    is_sellable_online: bool
    fulfilment_priority: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StockLevelOut(BaseModel):
    variant_id: int
    location_id: int
    on_hand: int
    reserved: int
    incoming: int
    safety_stock: int
    available: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class StockAdjustRequest(BaseModel):
    variant_id: int
    location_id: int
    qty_delta: int
    note: str = Field(min_length=1, description="Required for manual adjustments")


class StockMovementOut(BaseModel):
    id: int
    variant_id: int
    location_id: int
    qty_delta: int
    reason: str
    ref_type: str | None
    ref_id: int | None
    unit_cost: Decimal | None
    balance_after: int | None
    actor_user_id: int | None
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TransferItemIn(BaseModel):
    variant_id: int
    qty_requested: int = Field(gt=0)


class TransferItemOut(BaseModel):
    id: int
    variant_id: int
    qty_requested: int
    qty_dispatched: int
    qty_received: int

    model_config = {"from_attributes": True}


class TransferCreate(BaseModel):
    from_location_id: int
    to_location_id: int
    note: str | None = None
    items: list[TransferItemIn] = Field(min_length=1)


class TransferOut(BaseModel):
    id: int
    transfer_number: str
    from_location_id: int
    to_location_id: int
    status: str
    created_by_user_id: int
    dispatched_at: datetime | None
    received_at: datetime | None
    note: str | None
    created_at: datetime
    items: list[TransferItemOut]

    model_config = {"from_attributes": True}


class TransferDispatchItem(BaseModel):
    item_id: int
    qty_dispatched: int | None = None  # defaults to qty_requested if omitted


class TransferDispatchRequest(BaseModel):
    items: list[TransferDispatchItem] = []


class TransferReceiveItem(BaseModel):
    item_id: int
    qty_received: int


class TransferReceiveRequest(BaseModel):
    items: list[TransferReceiveItem] = Field(min_length=1)


class StockCountCreate(BaseModel):
    location_id: int
    scope: str = Field(description="full | cycle | category")
    scope_filter: dict | None = None
    variant_ids: list[int] = Field(min_length=1, description="Variants in scope for this count")


class StockCountItemOut(BaseModel):
    id: int
    variant_id: int
    system_qty: int
    counted_qty: int | None
    variance: int | None
    counted_by_user_id: int | None
    counted_at: datetime | None

    model_config = {"from_attributes": True}


class StockCountOut(BaseModel):
    id: int
    count_number: str
    location_id: int
    scope: str
    status: str
    started_by_user_id: int
    approved_by_user_id: int | None
    started_at: datetime
    applied_at: datetime | None
    items: list[StockCountItemOut]

    model_config = {"from_attributes": True}


class StockCountRecordItem(BaseModel):
    item_id: int
    counted_qty: int


class StockCountRecordRequest(BaseModel):
    items: list[StockCountRecordItem] = Field(min_length=1)
