from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.cms import ContactMessage
from app.schemas.cms import ContactMessageRead, ContactMessageUpdate
from app.services import contact_service

router = APIRouter()


@router.get("")
def list_messages(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _user=Depends(require("contact.view")),
) -> dict:
    items, next_cursor = contact_service.list_messages(db, cursor, limit, status_filter)
    return {
        "items": [ContactMessageRead.model_validate(item).model_dump() for item in items],
        "next_cursor": next_cursor,
    }


@router.get("/new-count")
def new_count(
    db: Session = Depends(get_db), _user=Depends(require("contact.view"))
) -> dict:
    return {"count": contact_service.new_message_count(db)}


@router.get("/{message_id}", response_model=ContactMessageRead)
def get_message(
    message_id: int, db: Session = Depends(get_db), _user=Depends(require("contact.view"))
) -> ContactMessage:
    return contact_service.get_message(db, message_id)


@router.patch("/{message_id}", response_model=ContactMessageRead)
def update_message(
    message_id: int,
    payload: ContactMessageUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("contact.manage")),
) -> ContactMessage:
    """Status is the only mutable field — there is no delete; `closed` is the
    archive."""
    return contact_service.update_status(db, message_id, payload.status)
