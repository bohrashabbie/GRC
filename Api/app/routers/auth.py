from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    MfaVerifyRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RefreshResponse,
)
from app.services import auth_service

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> LoginResponse:
    user = auth_service.authenticate(db, payload.email, payload.password)

    if auth_service.requires_mfa(user):
        return LoginResponse(mfa_required=True, challenge_token=auth_service.issue_mfa_challenge(user))

    access_token, refresh_token = auth_service.issue_session(
        db, user, ip=_client_ip(request), user_agent=request.headers.get("user-agent")
    )
    return LoginResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/mfa/verify", response_model=LoginResponse)
def verify_mfa(payload: MfaVerifyRequest, request: Request, db: Session = Depends(get_db)) -> LoginResponse:
    access_token, refresh_token, _user = auth_service.verify_mfa_and_issue_session(
        db,
        payload.challenge_token,
        payload.code,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return LoginResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> RefreshResponse:
    access_token, refresh_token, _user = auth_service.rotate_refresh_token(db, payload.refresh_token)
    return RefreshResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> None:
    auth_service.revoke_session(db, payload.refresh_token)


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(
    payload: PasswordResetRequest, request: Request, db: Session = Depends(get_db)
) -> dict:
    auth_service.request_password_reset(db, payload.email, ip=_client_ip(request))
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)) -> None:
    auth_service.confirm_password_reset(db, payload.token, payload.new_password)


# Permission keys used by this router: none. Every endpoint here is
# intentionally reachable without a token — that's the point of a
# login/refresh/reset flow.
