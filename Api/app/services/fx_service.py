"""Exchange rates for showing storefront prices in the visitor's currency.

Display only: every price, order and payment stays in KWD (Hard Rule 1). A
visitor may choose to see prices converted; the checkout still shows and
takes the KD amount.

Rates come from open.er-api.com (free, no key, KWD base) and are parsed
straight into ``Decimal`` — never ``float`` — then kept in the ``fx.rates``
setting. There is no background worker in this stack, so the first request
after the rates go stale (26 hours) refreshes them. A failed fetch keeps the
last good set and is not retried for an hour, so an outage at the source never
slows every page down. Staff can pin any rate with the ``fx.overrides``
setting, e.g. ``{"SAR": "12.200"}``.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.system import Setting

log = logging.getLogger(__name__)

SOURCE_URL = "https://open.er-api.com/v6/latest/KWD"
RATES_KEY = "fx.rates"
OVERRIDES_KEY = "fx.overrides"
STALE_AFTER = timedelta(hours=26)
RETRY_AFTER_FAILURE = timedelta(hours=1)

#: Listed first, after KWD: the Gulf, then the currencies visitors most often
#: think in.
FEATURED = ("SAR", "AED", "QAR", "BHD", "OMR", "USD", "EUR", "GBP", "INR", "EGP")

_refresh_lock = threading.Lock()
_last_failure: datetime | None = None


def parse_rates(body: str | bytes) -> dict[str, Decimal]:
    """Rates from the source's JSON, as Decimals, keyed by ISO code."""
    data = json.loads(body, parse_float=Decimal, parse_int=Decimal)
    if data.get("result") != "success" or data.get("base_code") not in (None, "KWD"):
        raise ValueError("exchange-rate source did not return KWD rates")
    rates: dict[str, Decimal] = {}
    for code, value in (data.get("rates") or {}).items():
        try:
            rate = Decimal(value)
        except (InvalidOperation, TypeError):
            continue
        if isinstance(code, str) and len(code) == 3 and code.isalpha() and rate > 0:
            rates[code.upper()] = rate
    if "USD" not in rates:
        raise ValueError("exchange-rate source returned no usable rates")
    rates["KWD"] = Decimal(1)
    return rates


def _is_stale(row: Setting | None, now: datetime) -> bool:
    if row is None or not isinstance(row.value, dict) or "fetched_at" not in row.value:
        return True
    try:
        fetched = datetime.fromisoformat(row.value["fetched_at"])
    except (TypeError, ValueError):
        return True
    return now - fetched > STALE_AFTER


def refresh_rates(db: Session, client: httpx.Client | None = None) -> int:
    """Fetch today's rates and store them. Returns how many were stored, or 0
    when the source failed and the previous rates were kept."""
    global _last_failure
    try:
        if client is None:
            with httpx.Client(timeout=8) as own:
                response = own.get(SOURCE_URL)
        else:
            response = client.get(SOURCE_URL)
        response.raise_for_status()
        rates = parse_rates(response.content)
    except (httpx.HTTPError, ValueError) as exc:
        _last_failure = datetime.now(timezone.utc)
        log.warning("exchange rates not refreshed, keeping the last good set: %s", type(exc).__name__)
        return 0

    now = datetime.now(timezone.utc)
    value = {
        "base": "KWD",
        "source": SOURCE_URL,
        "fetched_at": now.isoformat(),
        "rates": {code: str(rate) for code, rate in sorted(rates.items())},
    }
    # Two shoppers can arrive on a stale set at once; an upsert lets both win.
    db.execute(
        insert(Setting)
        .values(key=RATES_KEY, value=value, group="fx", is_public=False, updated_at=now)
        .on_conflict_do_update(index_elements=[Setting.key], set_={"value": value, "updated_at": now})
    )
    db.commit()
    _last_failure = None
    log.info("exchange rates refreshed: %d currencies", len(rates))
    return len(rates)


def _refresh_if_stale(db: Session) -> None:
    now = datetime.now(timezone.utc)
    if not _is_stale(db.get(Setting, RATES_KEY), now):
        return
    if _last_failure is not None and now - _last_failure < RETRY_AFTER_FAILURE:
        return
    # One refresh per process at a time; anyone else serves what is stored.
    if not _refresh_lock.acquire(blocking=False):
        return
    try:
        db.expire_all()
        if _is_stale(db.get(Setting, RATES_KEY), now):
            refresh_rates(db)
    finally:
        _refresh_lock.release()


def currencies(db: Session) -> dict[str, Any]:
    """Every currency a price can be shown in, with units per 1 KWD.

    KWD first, then the featured ones, then the rest by code. Staff overrides
    win over the fetched rate. Without any rates yet, KWD alone. Decimal places
    are left to the storefront, which has the CLDR data (Intl) to know them.
    """
    _refresh_if_stale(db)
    row = db.get(Setting, RATES_KEY)
    value = row.value if row is not None and isinstance(row.value, dict) else {}
    stored: dict[str, str] = dict(value.get("rates") or {})

    overrides_row = db.get(Setting, OVERRIDES_KEY)
    overrides = overrides_row.value if overrides_row is not None else None
    if isinstance(overrides, dict):
        for code, rate in overrides.items():
            try:
                parsed = Decimal(str(rate))
            except InvalidOperation:
                continue
            if parsed > 0 and len(str(code)) == 3:
                stored[str(code).upper()] = str(parsed)
    stored["KWD"] = "1"

    order = ["KWD", *[c for c in FEATURED if c in stored]]
    order += sorted(c for c in stored if c not in order)
    return {
        "base": "KWD",
        "updated_at": value.get("fetched_at"),
        "items": [{"code": code, "rate": stored[code]} for code in order],
    }
