from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.cms import NewsletterSubscriber
from app.schemas.cms import NewsletterSubscriberRead
from app.services import contact_service

router = APIRouter()


@router.get("")
def list_subscribers(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    subscribed: bool | None = Query(None, description="true = still on the list"),
    db: Session = Depends(get_db),
    _user=Depends(require("contact.view")),
) -> dict:
    """Cursor-paginated on (created_at, id) descending — newest sign-up first."""
    items, next_cursor = contact_service.list_subscribers(db, cursor, limit, subscribed)
    return {
        "items": [NewsletterSubscriberRead.model_validate(item).model_dump() for item in items],
        "next_cursor": next_cursor,
    }


@router.delete("/{subscriber_id}", response_model=NewsletterSubscriberRead)
def unsubscribe(
    subscriber_id: int, db: Session = Depends(get_db), _user=Depends(require("contact.manage"))
) -> NewsletterSubscriber:
    """Marks the address as opted out rather than removing the row, so an
    import can never put someone back on a list they left."""
    return contact_service.unsubscribe(db, subscriber_id)


# Permission keys used by this router: contact.view, contact.manage
