"""Porter Express, the delivery company, and nothing else: one file to change
if the courier or its API ever does, as hesabe.py is for payment.

Porter has no customer API enabled for this account ("You are not allowed to
access the API"), so this signs in the way their own portal does and calls the
same endpoints it calls. Shapes below are taken from that portal; a reply that
does not look as expected raises PorterError rather than being guessed at.

Tokens last 20 minutes; one is kept in memory, refreshed shortly before it
expires, and re-issued once if Porter rejects it early. Account details (branch,
customer, the default pickup address), service ids and the area list change
rarely and are cached. Nothing here touches the database.
"""

from __future__ import annotations

import base64
import json
import logging
import threading
import time
from typing import Any

import httpx

from app.config import settings

log = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 30
_lock = threading.Lock()
_token: dict[str, Any] = {"value": None, "expires": 0.0, "claims": {}}
_cache: dict[str, tuple[float, Any]] = {}


class PorterError(Exception):
    """Porter could not be reached, or refused the request."""


def is_enabled() -> bool:
    return bool(settings.porter_base_url and settings.porter_email and settings.porter_password)


def _base() -> str:
    return settings.porter_base_url.rstrip("/") + "/api"


def _login() -> None:
    try:
        response = httpx.post(
            f"{_base()}/Account/AuthenticateMyPortal",
            json={"email": settings.porter_email, "password": settings.porter_password},
            timeout=_TIMEOUT_SECONDS,
        )
        body = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise PorterError(f"sign-in failed: {type(exc).__name__}") from exc
    token = body.get("accessToken") if isinstance(body, dict) else None
    if response.status_code != 200 or not token:
        message = body.get("message") if isinstance(body, dict) else None
        raise PorterError(f"sign-in refused: {message or response.status_code}")
    claims = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
    # Renew a minute early so a request never sets off with a token about to lapse.
    _token.update(value=token, expires=time.time() + int(body.get("expiresIn") or 1200) - 60, claims=claims)


def _headers() -> dict[str, str]:
    with _lock:
        if not _token["value"] or time.time() >= _token["expires"]:
            _login()
        return {"Authorization": f"Bearer {_token['value']}", "Accept": "application/json"}


def _request(method: str, path: str, **kwargs) -> Any:
    for attempt in (1, 2):
        try:
            response = httpx.request(method, f"{_base()}/{path}", headers=_headers(), timeout=_TIMEOUT_SECONDS, **kwargs)
        except httpx.HTTPError as exc:
            raise PorterError(f"{path} failed: {type(exc).__name__}") from exc
        if response.status_code == 401 and attempt == 1:
            with _lock:
                _token["value"] = None  # Porter ended the session early: sign in again, once.
            continue
        try:
            body = response.json() if response.content else None
        except ValueError:
            body = response.text
        if response.status_code >= 400:
            message = body.get("message") if isinstance(body, dict) else str(body)[:200]
            raise PorterError(f"{path} refused ({response.status_code}): {message}")
        return body
    raise PorterError(f"{path}: not signed in")


def _cached(key: str, seconds: int, load):
    hit = _cache.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    value = load()
    _cache[key] = (time.time() + seconds, value)
    return value


def account() -> dict[str, Any]:
    """Branch, customer id and the default pickup address on Porter's side."""

    def load():
        _headers()  # make sure there are claims to read
        claims = _token["claims"]
        customer = _request("GET", "Customer/GetByUserId", params={"id": claims["unique_name"]})
        addresses = _request("GET", "Customer/GetCustomeraddresses", params={"id": customer["encryptedId"]})
        default = next((a for a in addresses if a.get("isDefault")), addresses[0] if addresses else None)
        if default is None:
            raise PorterError("the Porter account has no pickup address; add one in the Porter portal")
        return {
            "branch_id": claims["encryptedBranchId"],
            "customer_id": customer["encryptedId"],
            "pickup_address": default["address"],
        }

    return _cached("account", 3600, load)


def services() -> dict[str, dict[str, str]]:
    """{code: {"id", "name"}} — DS domestic standard, DE express, DF fast track."""
    return _cached(
        "services",
        6 * 3600,
        lambda: {
            p["productCode"]: {"id": p["encryptedId"], "name": p["name"]}
            for p in _request("GET", "Product/GetAll", params={"id": account()["branch_id"]})
            if p.get("status", True)
        },
    )


def areas() -> list[dict[str, str]]:
    """Kuwait's delivery areas as Porter names them, e.g. "HAWALLY-SALMIYA"."""
    return _cached(
        "areas",
        6 * 3600,
        lambda: [
            {"id": a["encryptedId"], "name": a["name"]}
            for a in _request("GET", "Area/GetAllByCountry", params={"id": "KW"})
        ],
    )


def create_shipment(payload: dict[str, Any]) -> dict[str, Any]:
    """Book the shipment. Returns Porter's record, which carries the awbNo."""
    body = _request("POST", "Shipment/Save", json=payload)
    if not isinstance(body, dict) or not body.get("awbNo"):
        raise PorterError(f"booking returned no tracking number: {str(body)[:200]}")
    return body


def tracking(awb_no: str) -> list[dict[str, Any]]:
    """The shipment's history, newest last as Porter lists it."""
    body = _request(
        "POST", "CustomerShipment/GetTrackingDetailsMyPortal", json={"awbNo": awb_no, "ref2": "", "ref1": "", "cellNo": ""}
    )
    return body if isinstance(body, list) else []


def label_html(awb_nos: list[str]) -> str:
    """Printable labels, as the HTML page Porter's portal prints."""
    body = _request("POST", "CustomerShipment/ExportBulkLabelsHtml", json=awb_nos)
    html = body.get("data") if isinstance(body, dict) else body
    if not isinstance(html, str) or not html.strip():
        raise PorterError("Porter returned no label")
    return html
