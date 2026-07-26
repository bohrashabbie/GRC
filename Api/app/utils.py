"""Money quantization, slugify (ASCII + Arabic), and cursor pagination.

Pagination is always keyset on (created_at, id) descending — newest first,
never OFFSET. Cursor is an opaque base64 blob; callers must not parse it.
"""

from __future__ import annotations

import base64
import json
import re
import unicodedata
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import Select, tuple_
from sqlalchemy.orm import Session

_ARABIC_DIACRITICS = re.compile(r"[ؗ-ًؚ-ْٰۖ-ۭ]")
_NON_SLUG_ASCII = re.compile(r"[^a-z0-9]+")
_NON_SLUG_ARABIC = re.compile(r"[^\w؀-ۿ]+", re.UNICODE)


def slugify(text: str, locale: str = "en") -> str:
    """en: lowercase ASCII slug. ar: strip diacritics/punctuation, keep the
    Arabic script and hyphenate whitespace — percent-encoding for URLs is an
    edge concern, not this function's."""
    text = text.strip()
    if locale == "ar":
        text = _ARABIC_DIACRITICS.sub("", text)
        text = _NON_SLUG_ARABIC.sub("-", text)
        return text.strip("-")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = _NON_SLUG_ASCII.sub("-", text.lower())
    return text.strip("-")


def quantize_money(value: Any) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def encode_cursor(created_at: datetime, id_: int) -> str:
    raw = json.dumps([created_at.isoformat(), id_])
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, int]:
    created_at_iso, id_ = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
    return datetime.fromisoformat(created_at_iso), id_


def paginate(db: Session, stmt: Select, model: type, cursor: str | None, limit: int) -> tuple[list, str | None]:
    """Applies keyset pagination on (created_at, id) descending to stmt (which
    should already carry its WHERE filters) and executes it. Returns
    (items, next_cursor) where next_cursor is None on the last page."""
    if cursor:
        created_at_val, cursor_id = decode_cursor(cursor)
        stmt = stmt.where(tuple_(model.created_at, model.id) < (created_at_val, cursor_id))
    stmt = stmt.order_by(model.created_at.desc(), model.id.desc()).limit(limit + 1)
    rows = list(db.execute(stmt).scalars().all())
    next_cursor = None
    if len(rows) > limit:
        rows = rows[:limit]
        next_cursor = encode_cursor(rows[-1].created_at, rows[-1].id)
    return rows, next_cursor
