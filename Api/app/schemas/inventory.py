from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.catalog import LabelTranslationIn, LabelTranslationOut


class LocationTypeCreate(BaseModel):
    # Derived from the English label when omitted, like every other code.
    code: str | None = None
    sort_order: int = 0
    is_active: bool = True
    translations: list[LabelTranslationIn] = Field(min_length=1)


class LocationTypeUpdate(BaseModel):
    sort_order: int | None = None
    is_active: bool | None = None
    translations: list[LabelTranslationIn] | None = None


class LocationTypeOut(BaseModel):
    id: int
    code: str
    sort_order: int
    is_active: bool
    created_at: datetime
    translations: list[LabelTranslationOut]
    # Places of this type — what makes "in use" visible before a delete.
    location_count: int = 0

    model_config = {"from_attributes": True}


class LocationCreate(BaseModel):
    # Optional: the admin no longer asks for one. The service derives it from
    # the English name when omitted.
    code: str | None = None
    type: str = Field(description="warehouse | store | virtual")
    name_ar: str
    name_en: str
    is_sellable_online: bool = True
    fulfilment_priority: int = 0
    is_active: bool = True


class LocationUpdate(BaseModel):
    # Type is editable: a site genuinely changes role (a back room becomes a
    # shop floor), and the value only drives labelling and fulfilment choice,
    # not the stock ledger — nothing historical is invalidated by a change.
    type: str | None = Field(default=None, description="warehouse | store | virtual")
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
