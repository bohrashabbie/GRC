"""The Contact Us inbox.

Kept out of cms_service on size grounds alone — the contact page itself is
CMS, but its submissions are an inbox with their own lifecycle (new -> read ->
closed). Nothing here is hard-deleted; `closed` is the archive.
"""

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.cms import ContactMessage
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
