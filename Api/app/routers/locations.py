from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.inventory import Location
from app.schemas.inventory import LocationCreate, LocationOut, LocationUpdate
from app.services import inventory_service
from app.utils import paginate

router = APIRouter()


@router.post("", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate, db: Session = Depends(get_db), _user=Depends(require("location.manage"))
) -> Location:
    return inventory_service.create_location(db, payload)


@router.get("")
def list_locations(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    type_: str | None = Query(None, alias="type"),
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("inventory.view")),
) -> dict:
    stmt = select(Location)
    if type_ is not None:
        stmt = stmt.where(Location.type == type_)
    if is_active is not None:
        stmt = stmt.where(Location.is_active == is_active)
    items, next_cursor = paginate(db, stmt, Location, cursor, limit)
    return {"items": [LocationOut.model_validate(l) for l in items], "next_cursor": next_cursor}


@router.get("/{location_id}", response_model=LocationOut)
def get_location(location_id: int, db: Session = Depends(get_db), _user=Depends(require("inventory.view"))) -> Location:
    return inventory_service.get_location(db, location_id)


@router.patch("/{location_id}", response_model=LocationOut)
def update_location(
    location_id: int,
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("location.manage")),
) -> Location:
    return inventory_service.update_location(db, location_id, payload)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def deactivate_location(
    location_id: int, db: Session = Depends(get_db), _user=Depends(require("location.manage"))
) -> None:
    inventory_service.update_location(db, location_id, LocationUpdate(is_active=False))


# Permission keys used by this router: inventory.view, location.manage
