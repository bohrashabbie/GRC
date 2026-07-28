from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require
from app.models.catalog import Option
from app.schemas.catalog import OptionCreate, OptionOut, OptionUpdate
from app.services import catalog_service
from app.utils import paginate

router = APIRouter()


@router.post("", response_model=OptionOut, status_code=201)
def create_option(
    payload: OptionCreate, db: Session = Depends(get_db), _user=Depends(require("catalog.manage"))
) -> Option:
    return catalog_service.create_option(db, payload)


@router.get("")
def list_options(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.view")),
) -> dict:
    stmt = (
        select(Option)
        .where(Option.code.in_(catalog_service.SYSTEM_OPTION_CODES))
        .options(selectinload(Option.translations))
    )
    items, next_cursor = paginate(db, stmt, Option, cursor, limit)
    items.sort(key=lambda option: (option.sort_order, option.id))
    return {"items": [OptionOut.model_validate(o) for o in items], "next_cursor": next_cursor}


@router.get("/{option_id}", response_model=OptionOut)
def get_option(option_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))) -> Option:
    return catalog_service.get_option(db, option_id)


@router.patch("/{option_id}", response_model=OptionOut)
def update_option(
    option_id: int, payload: OptionUpdate, db: Session = Depends(get_db), _user=Depends(require("catalog.manage"))
) -> Option:
    return catalog_service.update_option(db, option_id, payload)


# Permission keys used by this router: catalog.view, catalog.manage
#
# No DELETE here: options/option_values carry no is_active or similar soft-
# delete column in the workbook, and hard-deleting risks silently detaching
# an in-use variant's option link. Deactivation for these two resources is
# deliberately not exposed until that's resolved.
