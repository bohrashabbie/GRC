from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CustomerUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    locale_pref: str | None = None
    accepts_marketing: bool | None = None
    is_active: bool | None = None


class CustomerOut(BaseModel):
    id: int
    email: str | None
    phone_e164: str | None
    first_name: str | None
    last_name: str | None
    locale_pref: str
    accepts_marketing: bool
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CustomerAddressCreate(BaseModel):
    label: str | None = None
    recipient_name: str
    phone_e164: str
    line1: str
    line2: str | None = None
    district: str | None = None
    city: str
    region_id: int
    postal_code: str | None = None
    country_code: str = "SA"
    national_short_address: str | None = None
    is_default_shipping: bool = False
    is_default_billing: bool = False


class CustomerAddressUpdate(BaseModel):
    label: str | None = None
    recipient_name: str | None = None
    phone_e164: str | None = None
    line1: str | None = None
    line2: str | None = None
    district: str | None = None
    city: str | None = None
    region_id: int | None = None
    postal_code: str | None = None
    is_default_shipping: bool | None = None
    is_default_billing: bool | None = None


class CustomerAddressOut(BaseModel):
    id: int
    customer_id: int
    label: str | None
    recipient_name: str
    phone_e164: str
    line1: str
    line2: str | None
    district: str | None
    city: str
    region_id: int
    postal_code: str | None
    country_code: str
    is_default_shipping: bool
    is_default_billing: bool
    created_at: datetime

    model_config = {"from_attributes": True}
