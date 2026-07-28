from __future__ import annotations

from datetime import datetime

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
