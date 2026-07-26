"""Every write to orders, payments, prices, or roles must call record() with
only the changed fields — never a full-row snapshot. Callers pass their own
db session; record() only stages the row, the caller's transaction commits it
alongside the actual mutation so both succeed or fail together.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models.auth import AuditLog


def record(
    db: Session,
    *,
    actor_user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None,
    before: dict | None = None,
    after: dict | None = None,
    actor_type: str = "staff",
    ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            actor_type=actor_type,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_json=before,
            after_json=after,
            ip=ip,
            user_agent=user_agent,
        )
    )


def diff_changed_fields(instance: Any, proposed: dict[str, Any]) -> tuple[dict, dict]:
    """Given an ORM instance and a dict of proposed new values, returns
    (before, after) containing only the fields that actually changed."""
    before: dict = {}
    after: dict = {}
    for field, new_value in proposed.items():
        old_value = getattr(instance, field, None)
        if old_value != new_value:
            before[field] = _jsonable(old_value)
            after[field] = _jsonable(new_value)
    return before, after


def _jsonable(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value
