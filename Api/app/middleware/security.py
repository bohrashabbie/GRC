"""Password hashing, JWT issuance/verification, and TOTP helpers.

Access tokens are JWTs (short-lived, stateless). Refresh tokens are opaque
random strings, not JWTs: rotate_refresh_token validates them purely via the
stored hash + user_sessions.expires_at, so there is nothing to gain from
making them parseable, and an opaque token leaks no metadata if intercepted.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import pyotp
from jose import JWTError, jwt
from passlib.hash import argon2

from app.config import settings
from app.middleware.error import AuthenticationError

ACCESS_TOKEN_TYPE = "access"
MFA_CHALLENGE_TYPE = "mfa_challenge"
MFA_CHALLENGE_EXPIRE_MINUTES = 5
# Storefront customers carry a deliberately different token type from staff.
# decode_access_token rejects anything that is not ACCESS_TOKEN_TYPE, so a
# shopper's token can never authenticate against an admin endpoint, and the
# reverse is refused too. One shared secret, two disjoint audiences.
CUSTOMER_ACCESS_TOKEN_TYPE = "customer_access"
CUSTOMER_TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    return argon2.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return argon2.verify(password, password_hash)


def _encode(subject: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "typ": token_type, "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    return _encode(subject, ACCESS_TOKEN_TYPE, timedelta(minutes=settings.access_token_expire_minutes))


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise AuthenticationError("Invalid or expired access token.") from exc
    if payload.get("typ") != ACCESS_TOKEN_TYPE:
        raise AuthenticationError("Invalid token type.")
    return payload


def create_customer_access_token(customer_id: int) -> str:
    """Long-lived by staff standards, because a shopper being logged out of a
    storefront mid-browse is a lost sale, not a security win — and this token
    grants nothing beyond one customer's own wishlist and orders."""
    return _encode(
        str(customer_id),
        CUSTOMER_ACCESS_TOKEN_TYPE,
        timedelta(days=CUSTOMER_TOKEN_EXPIRE_DAYS),
    )


def decode_customer_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise AuthenticationError("Invalid or expired session.") from exc
    if payload.get("typ") != CUSTOMER_ACCESS_TOKEN_TYPE:
        raise AuthenticationError("Invalid token type.")
    return payload


def create_refresh_token(subject: str) -> str:
    del subject  # opaque token; identity is resolved via the user_sessions row, not the token itself
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_mfa_challenge_token(user_id: int) -> str:
    return _encode(str(user_id), MFA_CHALLENGE_TYPE, timedelta(minutes=MFA_CHALLENGE_EXPIRE_MINUTES))


def decode_mfa_challenge_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise AuthenticationError("MFA challenge expired or invalid, please log in again.") from exc
    if payload.get("typ") != MFA_CHALLENGE_TYPE:
        raise AuthenticationError("Invalid token type.")
    return int(payload["sub"])


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def totp_provisioning_uri(secret: str, account_email: str, issuer: str = "AlShiaka Admin") -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=account_email, issuer_name=issuer)


def verify_totp_code(secret: str, code: str) -> bool:
    return pyotp.totp.TOTP(secret).verify(code, valid_window=1)
