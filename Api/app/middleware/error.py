# app/errors.py
"""
Central error model for the admin API.

Every error response — whether raised deliberately via AppError or produced
by FastAPI/Pydantic validation — is normalized to the same envelope:

    {"code": "string", "message": "string", "details": {...} | null}

Routers and services should raise AppError subclasses. Never raise a bare
HTTPException from inside app/services or app/routers — wrap it here so the
frontend only ever has to handle one shape.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")


# --------------------------------------------------------------------------- 
# Base error + domain-specific subclasses
# ---------------------------------------------------------------------------

class AppError(Exception):
    """Base class for all deliberate application errors.

    code    - machine-readable, stable, safe to branch on in the frontend
              (e.g. "variant_limit_exceeded", "permission_denied")
    message - human-readable, safe to show to a staff user
    details - optional structured extra context (field errors, counts, etc.)
    status_code - HTTP status to return
    """

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "bad_request"

    def __init__(self, message: str, *, details: dict | None = None, code: str | None = None):
        self.message = message
        self.details = details
        if code:
            self.code = code
        super().__init__(message)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"

    def __init__(self, message: str = "Resource not found", **kwargs):
        super().__init__(message, **kwargs)


class ValidationAppError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "validation_error"

    def __init__(self, message: str = "Validation failed", **kwargs):
        super().__init__(message, **kwargs)


class ConflictError(AppError):
    """Use for unique-constraint violations, duplicate slugs, etc."""

    status_code = status.HTTP_409_CONFLICT
    code = "conflict"

    def __init__(self, message: str = "Conflicting state", **kwargs):
        super().__init__(message, **kwargs)


class PermissionDeniedError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "permission_denied"

    def __init__(self, message: str = "You do not have permission to do this", **kwargs):
        super().__init__(message, **kwargs)


class AuthenticationError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "authentication_failed"

    def __init__(self, message: str = "Authentication failed", **kwargs):
        super().__init__(message, **kwargs)


class BusinessRuleError(AppError):
    """Use for domain-rule violations that aren't simple validation —
    e.g. the 300-variant cap, an invalid order status transition,
    insufficient available stock."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "business_rule_violation"

    def __init__(self, message: str = "This operation violates a business rule", **kwargs):
        super().__init__(message, **kwargs)


# --------------------------------------------------------------------------- 
# Envelope helper
# ---------------------------------------------------------------------------

def _envelope(code: str, message: str, details: dict | None = None) -> dict:
    return {"code": code, "message": message, "details": details}


# --------------------------------------------------------------------------- 
# Handler registration
# ---------------------------------------------------------------------------

def register_exception_handlers(app: FastAPI) -> None:
    """Wire every exception type the app can raise to the shared envelope.
    Call this once from main.py, right after creating the FastAPI() instance."""

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Reshape Pydantic/FastAPI's default error list into our envelope
        # instead of letting {"detail": [...]} leak through.
        field_errors = [
            {
                "field": ".".join(str(p) for p in err["loc"] if p != "body"),
                "message": err["msg"],
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_envelope(
                "validation_error",
                "One or more fields are invalid.",
                {"fields": field_errors},
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        # Catches FastAPI's own HTTPException (404 route not found, 405, etc.)
        # so even framework-level errors match the envelope.
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope("http_error", str(exc.detail)),
        )

    @app.exception_handler(IntegrityError)
    async def handle_integrity_error(
        request: Request, exc: IntegrityError
    ) -> JSONResponse:
        # Unique constraint / FK violations that slipped past service-level
        # checks. Logged with full detail server-side, generic message to
        # the client — never leak raw SQL or constraint names.
        logger.warning("IntegrityError on %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=_envelope(
                "conflict",
                "This operation conflicts with existing data (duplicate or invalid reference).",
            ),
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_db_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.error("Unhandled SQLAlchemyError on %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope("database_error", "A database error occurred."),
        )

    @app.exception_handler(Exception)
    async def handle_unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
        # Last-resort catch-all so a bug never returns FastAPI's default
        # HTML traceback page or a bare 500 with no body.
        logger.error("Unhandled exception on %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope("internal_error", "An unexpected error occurred."),
        )
