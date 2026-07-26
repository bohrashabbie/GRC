from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require
from app.models.auth import User
from app.schemas.auth import (
    CurrentUserOut,
    RoleOut,
    UserCreate,
    UserOut,
    UserRoleAssignIn,
    UserRoleAssignmentOut,
    UserUpdate,
)
from app.services import auth_service
from app.utils import paginate

router = APIRouter()


@router.get("/me", response_model=CurrentUserOut)
def read_current_user(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CurrentUserOut:
    role_assignments = auth_service.get_user_role_assignments(db, current_user)
    permissions = auth_service.get_user_permissions(db, current_user)
    return CurrentUserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        roles=[RoleOut(**assignment) for assignment in role_assignments],
        permissions=sorted(permissions),
    )


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require("user.create"))
) -> User:
    return auth_service.create_user(db, payload, current_user.id)


@router.get("")
def list_users(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("user.view")),
) -> dict:
    stmt = select(User)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    items, next_cursor = paginate(db, stmt, User, cursor, limit)
    return {"items": [UserOut.model_validate(u) for u in items], "next_cursor": next_cursor}


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), _user=Depends(require("user.view"))) -> User:
    return auth_service.get_user(db, user_id)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require("user.update"))
) -> User:
    return auth_service.update_user(db, user_id, payload, current_user.id)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def deactivate_user(
    user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require("user.update"))
) -> None:
    auth_service.deactivate_user(db, user_id, current_user.id)


@router.get("/{user_id}/roles", response_model=list[UserRoleAssignmentOut])
def list_user_roles(
    user_id: int, db: Session = Depends(get_db), _user=Depends(require("user.view"))
) -> list[dict]:
    return auth_service.list_user_role_assignments(db, user_id)


@router.post("/{user_id}/roles", response_model=UserRoleAssignmentOut, status_code=status.HTTP_201_CREATED)
def assign_user_role(
    user_id: int,
    payload: UserRoleAssignIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("user.assign_role")),
) -> dict:
    return auth_service.assign_role(db, user_id, payload, current_user.id)


@router.delete("/{user_id}/roles/{user_role_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def revoke_user_role(
    user_id: int,
    user_role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("user.assign_role")),
) -> None:
    auth_service.revoke_role(db, user_id, user_role_id, current_user.id)


# Permission keys used by this router: user.view, user.create, user.update, user.assign_role
