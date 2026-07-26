from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.middleware.error import NotFoundError
from app.models.system import Setting
from app.services import audit_service


def get_setting(db: Session, key: str) -> Setting:
    setting = db.get(Setting, key)
    if setting is None:
        raise NotFoundError("Setting not found")
    return setting


def upsert_setting(db: Session, key: str, data, actor_user_id: int) -> Setting:
    setting = db.get(Setting, key)
    before = {"value": setting.value} if setting is not None else None

    if setting is None:
        setting = Setting(
            key=key,
            value=data.value,
            group=data.group or "store",
            is_public=data.is_public if data.is_public is not None else False,
            updated_by_user_id=actor_user_id,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(setting)
    else:
        setting.value = data.value
        if data.group is not None:
            setting.group = data.group
        if data.is_public is not None:
            setting.is_public = data.is_public
        setting.updated_by_user_id = actor_user_id
        setting.updated_at = datetime.now(timezone.utc)

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="settings.update",
        entity_type="setting",
        entity_id=None,
        before=before,
        after={"value": data.value},
    )
    db.commit()
    db.refresh(setting)
    return setting
