from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.error import AuthenticationError, PermissionDeniedError
from app.middleware.security import decode_access_token
from app.models.auth import User
from app.permissions import all_permission_keys
from app.services import auth_service

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise AuthenticationError("Missing bearer token.")
    payload = decode_access_token(credentials.credentials)
    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise AuthenticationError("Account no longer active.")
    return user


def _extract_location_id(request: Request) -> int | None:
    header_value = request.headers.get("x-location-id")
    candidates = [header_value, request.path_params.get("location_id"), request.query_params.get("location_id")]
    for value in candidates:
        if value is None:
            continue
        try:
            return int(value)
        except (TypeError, ValueError):
            continue
    return None


def require(permission_key: str):
    """FastAPI dependency factory enforcing RBAC.

    A grant with user_roles.location_id NULL authorizes everywhere. A grant
    scoped to a location only authorizes requests that identify that same
    location, via an X-Location-Id header or a location_id path/query param.
    Frontend button-hiding is not enforcement — this dependency is.
    """
    if permission_key not in all_permission_keys():
        raise ValueError(f"Unknown permission key: {permission_key!r} — add it to app/permissions.py first.")

    def dependency(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        # Location ids rather than UserRole rows, so the lookup can be cached
        # (see auth_service.get_grant_location_ids). Semantics are unchanged.
        location_ids = auth_service.get_grant_location_ids(db, current_user, permission_key)
        if not location_ids:
            raise PermissionDeniedError(f"Missing permission: {permission_key}")

        if any(location_id is None for location_id in location_ids):
            return current_user

        requested_location_id = _extract_location_id(request)
        if requested_location_id is not None and requested_location_id in location_ids:
            return current_user

        raise PermissionDeniedError(
            f"Permission {permission_key} is only granted for specific locations, "
            "and this request didn't specify one you're scoped to."
        )

    return dependency
