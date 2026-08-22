"""The Contact Us inbox.

Kept out of cms_service on size grounds alone — the contact page itself is
CMS, but its submissions are an inbox with their own lifecycle (new -> read ->
closed). Nothing here is hard-deleted; `closed` is the archive.
"""

from datetime import datetime, timezone

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.cms import ContactMessage, NewsletterSubscriber
from app.schemas.cms import CONTACT_MESSAGE_STATUSES
from app.utils import paginate


def create_message(db: Session, data, locale: str) -> ContactMessage:
    """Public write path — no auth, so nothing from the request beyond the
    validated form fields and the Accept-Language locale is stored."""
    row = ContactMessage(
        name=data.name.strip(),
        email=data.email.strip().lower(),
        phone=data.phone.strip() if data.phone else None,
        subject=data.subject.strip() if data.subject else None,
        message=data.message.strip(),
        locale=locale if locale in {"ar", "en"} else "ar",
        status="new",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def subscribe(db: Session, email: str, locale: str, source: str = "footer"):
    """Add an address, or bring a lapsed one back.

    Signing up twice is not an error to a shopper — they typed their address
    into a box and pressed a button — so an address already on the list simply
    stays on it, and one that had unsubscribed is resubscribed rather than
    rejected as a duplicate.
    """
    address = email.strip().lower()
    existing = db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == address)
    ).scalar_one_or_none()
    if existing is not None:
        existing.unsubscribed_at = None
        existing.locale = locale if locale in {"ar", "en"} else existing.locale
        db.commit()
        db.refresh(existing)
        return existing

    row = NewsletterSubscriber(
        email=address,
        locale=locale if locale in {"ar", "en"} else "ar",
        source=source,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_subscribers(
    db: Session, cursor: str | None, limit: int, subscribed: bool | None = None
):
    stmt = select(NewsletterSubscriber)
    if subscribed is True:
        stmt = stmt.where(NewsletterSubscriber.unsubscribed_at.is_(None))
    elif subscribed is False:
        stmt = stmt.where(NewsletterSubscriber.unsubscribed_at.is_not(None))
    return paginate(db, stmt, NewsletterSubscriber, cursor, limit)


def unsubscribe(db: Session, subscriber_id: int):
    """Staff removing someone by hand — a timestamp, not a delete, so the
    address cannot be re-added by an import that does not know it opted out."""
    row = db.get(NewsletterSubscriber, subscriber_id)
    if row is None:
        raise NotFoundError("Subscriber not found")
    row.unsubscribed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


def list_messages(
    db: Session, cursor: str | None, limit: int, status: str | None = None
) -> tuple[list[ContactMessage], str | None]:
    stmt: Select = select(ContactMessage)
    if status:
        stmt = stmt.where(ContactMessage.status == status)
    return paginate(db, stmt, ContactMessage, cursor, limit)


def get_message(db: Session, message_id: int) -> ContactMessage:
    row = db.get(ContactMessage, message_id)
    if row is None:
        raise NotFoundError("Contact message not found")
    return row


def update_status(db: Session, message_id: int, status: str) -> ContactMessage:
    if status not in CONTACT_MESSAGE_STATUSES:
        raise BusinessRuleError(
            f"Unsupported status '{status}'. Expected one of: "
            f"{', '.join(sorted(CONTACT_MESSAGE_STATUSES))}"
        )
    row = get_message(db, message_id)
    row.status = status
    db.commit()
    db.refresh(row)
    return row


def new_message_count(db: Session) -> int:
    """Unread count for the admin sidebar badge."""
    return db.execute(
        select(func.count())
        .select_from(ContactMessage)
        .where(ContactMessage.status == "new")
    ).scalar_one()
