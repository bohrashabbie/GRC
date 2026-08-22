from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.inventory import LocationType
from app.schemas.common import DeletionResultOut
from app.schemas.inventory import (
    LocationTypeCreate,
    LocationTypeOut,
    LocationTypeUpdate,
)
from app.services import inventory_types

router = APIRouter()


@router.post("", response_model=LocationTypeOut, status_code=status.HTTP_201_CREATED)
def create_location_type(
    payload: LocationTypeCreate,
    db: Session = Depends(get_db),
    _user=Depends(require("location.manage")),
) -> LocationType:
    return inventory_types.create_location_type(db, payload)


@router.get("", response_model=list[LocationTypeOut])
def list_location_types(
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("inventory.view")),
) -> list[LocationType]:
    """Every type in display order, each with how many places use it."""
    return inventory_types.list_location_types(db, is_active=is_active)


@router.get("/{location_type_id}", response_model=LocationTypeOut)
def get_location_type(
    location_type_id: int, db: Session = Depends(get_db), _user=Depends(require("inventory.view"))
) -> LocationType:
    return inventory_types.get_location_type(db, location_type_id)


@router.patch("/{location_type_id}", response_model=LocationTypeOut)
def update_location_type(
    location_type_id: int,
    payload: LocationTypeUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("location.manage")),
) -> LocationType:
    return inventory_types.update_location_type(db, location_type_id, payload)


@router.delete("/{location_type_id}", response_model=DeletionResultOut)
def delete_location_type(
    location_type_id: int, db: Session = Depends(get_db), user=Depends(require("location.manage"))
) -> DeletionResultOut:
    """Refuses while places still carry the type, saying how many."""
    result = inventory_types.delete_location_type(db, location_type_id, actor_user_id=user.id)
    return DeletionResultOut(mode=result.mode, blockers=result.blockers)


# Permission keys used by this router: inventory.view, location.manage
