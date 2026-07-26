from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SettingUpdate(BaseModel):
    value: dict | list | str | int | float | bool | None
    group: str | None = None
    is_public: bool | None = None


class SettingOut(BaseModel):
    key: str
    value: dict | list | str | int | float | bool | None
    group: str
    is_public: bool
    updated_by_user_id: int | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: int
    actor_user_id: int | None
    actor_type: str
    action: str
    entity_type: str
    entity_id: int | None
    before_json: dict | None
    after_json: dict | None
    ip: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
