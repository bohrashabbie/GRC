"""The Hesabe payment gateway, and nothing else: one file to change if the
gateway ever does, the same way storage.py isolates file storage.

Hesabe hosts the payment page (KNET, cards, Apple Pay, Google Pay), so no card
data ever reaches this server. Requests and checkout responses are AES-256-CBC
with PKCS padding to a 32-byte block, hex encoded. The padding is confirmed
against the live sandbox — the docs show both 16 and 32, and the kit is gone.

Business rules live in payment_service. Nothing here touches the database.
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal
from typing import Any

import httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from app.config import settings

log = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 20
_PAD_BLOCK = 32

#: The smallest and largest amounts the checkout API accepts, in KWD.
MIN_AMOUNT = Decimal("0.200")
MAX_AMOUNT = Decimal("100000")


class HesabeError(Exception):
    """The gateway could not be reached, or refused the request. Says nothing
    about whether a customer paid: treat the outcome as still unknown."""


def is_enabled() -> bool:
    """Whether online payment can work. Lengths are checked because AES takes
    no other: a mistyped key should mean "not offered", not a checkout crash."""
    return bool(
        settings.hesabe_base_url
        and settings.hesabe_merchant_code
        and settings.hesabe_access_code
        and len(settings.hesabe_secret_key) == 32
        and len(settings.hesabe_iv_key) == 16
    )


def log_status() -> None:
    """Say at startup which gateway this process will charge through, so a
    wrong environment shows up in the log rather than in a customer's bank."""
    if is_enabled():
        log.info("online payment on: %s", settings.hesabe_base_url)
        if settings.env == "production" and "sandbox" in settings.hesabe_base_url:
            log.error("production is using the Hesabe SANDBOX: no real money will be taken")
    elif settings.hesabe_base_url or settings.hesabe_secret_key:
        log.error("Hesabe settings are incomplete or malformed: online payment is off")


def _cipher() -> Cipher:
    return Cipher(
        algorithms.AES(settings.hesabe_secret_key.encode()),
        modes.CBC(settings.hesabe_iv_key.encode()),
    )


def encrypt(text: str) -> str:
    raw = text.encode()
    size = _PAD_BLOCK - len(raw) % _PAD_BLOCK
    encryptor = _cipher().encryptor()
    return (encryptor.update(raw + bytes([size]) * size) + encryptor.finalize()).hex()


def decrypt(hex_text: str) -> str:
    """Raises ValueError for anything that is not valid ciphertext."""
    cipher_text = bytes.fromhex(hex_text.strip())
    if not cipher_text or len(cipher_text) % 16:
        raise ValueError("not a whole number of AES blocks")
    decryptor = _cipher().decryptor()
    raw = decryptor.update(cipher_text) + decryptor.finalize()
    size = raw[-1]
    if not 1 <= size <= _PAD_BLOCK or raw[-size:] != bytes([size]) * size:
        raise ValueError("bad padding")
    return raw[:-size].decode()


def _headers() -> dict[str, str]:
    return {"accessCode": settings.hesabe_access_code, "Accept": "application/json"}


def create_payment(
    *,
    reference: str,
    amount: Decimal,
    return_url: str,
    webhook_url: str,
    name: str | None = None,
    mobile: str | None = None,
) -> str:
    """Register a payment and return the hosted page to send the customer to.

    `email` is deliberately never sent: Hesabe refuses any address whose domain
    it cannot resolve, so one typo would stop a customer from paying at all.
    """
    payload: dict[str, Any] = {
        "merchantCode": settings.hesabe_merchant_code,
        "amount": f"{amount:.3f}",
        "paymentType": 0,  # indirect: Hesabe's page offers every enabled method
        "currency": "KWD",
        "responseUrl": return_url,
        "failureUrl": return_url,
        "version": "2.0",
        "orderReferenceNumber": reference,
        "webhookUrl": webhook_url,
    }
    optional = {"name": name, "mobile_number": mobile}
    payload.update({key: value for key, value in optional.items() if value})

    try:
        response = httpx.post(
            f"{settings.hesabe_base_url}/checkout",
            data={"data": encrypt(json.dumps(payload))},
            headers=_headers(),
            timeout=_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        raise HesabeError(f"checkout failed: {type(exc).__name__}") from exc
    try:
        body = json.loads(decrypt(response.text))
    except ValueError as exc:
        # Bad credentials are answered in plain JSON, not encrypted.
        raise HesabeError(f"checkout refused: HTTP {response.status_code}") from exc
    token = (body.get("response") or {}).get("data")
    if not body.get("status") or not token:
        raise HesabeError(f"checkout refused: {body.get('message')}")
    return f"{settings.hesabe_base_url}/payment?data={token}"


def find_transactions(reference: str) -> list[dict[str, Any]]:
    """Every attempt Hesabe holds for an order, straight from Hesabe.

    This is the only answer about a payment that may be trusted: a browser
    redirect and a webhook can both be forged, and the webhook is unsigned.
    An empty list means no attempt exists (yet). Raises HesabeError when the
    answer is unknown, which callers must not read as "not paid".
    """
    try:
        response = httpx.get(
            f"{settings.hesabe_base_url}/api/transaction/{reference}",
            params={"isOrderReference": 1},
            headers=_headers(),
            timeout=_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        raise HesabeError(f"enquiry failed: {type(exc).__name__}") from exc

    if response.status_code == 404:
        return []
    if response.status_code != 200:
        raise HesabeError(f"enquiry refused: HTTP {response.status_code}")
    try:
        body = response.json()
    except ValueError as exc:
        raise HesabeError("enquiry returned something other than JSON") from exc

    # The latest attempt, plus the full list in `results`: a bare list when
    # looked up by token, {"data": [...]} when looked up by order reference.
    results = body.get("results") or []
    if isinstance(results, dict):
        results = results.get("data") or []
    attempts = [*results, *([body["data"]] if body.get("data") else [])]
    unique = {str(attempt.get("token")): attempt for attempt in attempts}
    return [a for a in unique.values() if a.get("reference_number") == reference]
