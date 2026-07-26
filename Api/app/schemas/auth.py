from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    
class LoginResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    mfa_required: bool = False
    challenge_token: str | None = None  # set only when mfa_required is True

class MfaVerifyRequest(BaseModel):
    challenge_token: str
    code: str = Field(min_length=6, max_length=6)

class RefreshRequest(BaseModel):
    refresh_token: str
    
class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class LogoutRequest(BaseModel):
    refresh_token: str
    
class PasswordResetRequest(BaseModel):
    email: EmailStr
    
class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=10)

class RoleOut(BaseModel):
    id: int
    code: str
    name_ar: str
    name_en: str
    location_id: int | None = None

    model_config = {"from_attributes": True}
    
class CurrentUserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    roles: list[RoleOut]
    permissions: list[str]

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------
# Staff users
# --------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10)
    full_name: str
    phone_e164: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone_e164: str | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone_e164: str | None
    is_active: bool
    mfa_enabled_at: datetime | None
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRoleAssignIn(BaseModel):
    role_id: int
    location_id: int | None = None
    expires_at: datetime | None = None


class UserRoleAssignmentOut(BaseModel):
    id: int
    user_id: int
    role_id: int
    role_code: str
    location_id: int | None
    granted_by_user_id: int | None
    granted_at: datetime
    expires_at: datetime | None

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------
# Roles & permissions
# --------------------------------------------------------------------------

class PermissionOut(BaseModel):
    id: int
    key: str
    group: str
    description: str | None
    is_dangerous: bool

    model_config = {"from_attributes": True}


class RoleDetailOut(BaseModel):
    id: int
    code: str
    name_ar: str
    name_en: str
    description: str | None
    is_system: bool
    permission_keys: list[str] = []

    model_config = {"from_attributes": True}


class RolePermissionsUpdate(BaseModel):
    permission_keys: list[str]


class RoleCreate(BaseModel):
    code: str = Field(min_length=2, max_length=64, pattern=r"^[a-z][a-z0-9_]*$")
    name_ar: str
    name_en: str
    description: str | None = None
    permission_keys: list[str] = []