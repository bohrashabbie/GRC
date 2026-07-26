from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require
from app.models.catalog import OptionValue
from app.schemas.catalog import OptionValueCreate, OptionValueOut, OptionValueUpdate
from app.services import catalog_service
from app.utils import paginate

router = APIRouter()


@router.post("", response_model=OptionValueOut, status_code=201)
def create_option_value(
    payload: OptionValueCreate, db: Session = Depends(get_db), _user=Depends(require("catalog.manage"))
) -> OptionValue:
    return catalog_service.create_option_value(db, payload)


@router.get("")
def list_option_values(
    option_id: int | None = None,
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.view")),
) -> dict:
    stmt = select(OptionValue).options(selectinload(OptionValue.translations))
    if option_id is not None:
        stmt = stmt.where(OptionValue.option_id == option_id)
    items, next_cursor = paginate(db, stmt, OptionValue, cursor, limit)
    return {"items": [OptionValueOut.model_validate(v) for v in items], "next_cursor": next_cursor}


@router.get("/{option_value_id}", response_model=OptionValueOut)
def get_option_value(
    option_value_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))
) -> OptionValue:
    return catalog_service.get_option_value(db, option_value_id)


@router.patch("/{option_value_id}", response_model=OptionValueOut)
def update_option_value(
    option_value_id: int,
    payload: OptionValueUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.manage")),
) -> OptionValue:
    return catalog_service.update_option_value(db, option_value_id, payload)


# Permission keys used by this router: catalog.view, catalog.manage
