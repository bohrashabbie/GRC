from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import AuditLog
from app.utils import paginate

router = APIRouter()


@router.get("")
def list_audit_log(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    entity_type: str | None = None,
    actor_user_id: int | None = None,
    action: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("audit.view")),
) -> dict:
    """Read-only. Cursor-paginated on (created_at, id) descending. Filters:
    entity_type, actor_user_id, action, date_from, date_to."""
    stmt = select(AuditLog)
    if entity_type is not None:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if actor_user_id is not None:
        stmt = stmt.where(AuditLog.actor_user_id == actor_user_id)
    if action is not None:
        stmt = stmt.where(AuditLog.action == action)
    if date_from is not None:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(AuditLog.created_at <= date_to)
    items, next_cursor = paginate(db, stmt, AuditLog, cursor, limit)
    return {
        "items": [
            {
                "id": a.id,
                "actor_user_id": a.actor_user_id,
                "actor_type": a.actor_type,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "before_json": a.before_json,
                "after_json": a.after_json,
                "ip": a.ip,
                "created_at": a.created_at,
            }
            for a in items
        ],
        "next_cursor": next_cursor,
    }


# Permission keys used by this router: audit.view
