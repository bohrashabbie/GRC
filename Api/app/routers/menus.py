from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.cms import Menu, MenuItem
from app.schemas.cms import (
    MenuItemRead,
    MenuItemUpdate,
    MenuRead,
    MenuUpdate,
)
from app.services import cms_service

router = APIRouter()


@router.get("")
def list_menus(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user=Depends(require("cms.view")),
) -> dict:
    items, next_cursor = cms_service.list_menus(db, cursor, limit)
    return {
        "items": [MenuRead.model_validate(item).model_dump() for item in items],
        "next_cursor": next_cursor,
    }


@router.get("/{menu_id}", response_model=MenuRead)
def get_menu(
    menu_id: int, db: Session = Depends(get_db), _user=Depends(require("cms.view"))
) -> Menu:
    return cms_service.get_menu(db, menu_id)


@router.patch("/{menu_id}", response_model=MenuRead)
def update_menu(
    menu_id: int,
    payload: MenuUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("cms.menu.manage")),
) -> Menu:
    return cms_service.update_menu(db, menu_id, payload)


@router.patch("/items/{item_id}", response_model=MenuItemRead)
def update_menu_item(
    item_id: int,
    payload: MenuItemUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("cms.menu.manage")),
) -> MenuItem:
    """Menu items are seeded, not staff-created — this can only relabel an
    item's translations or flip is_active to hide it."""
    return cms_service.update_menu_item(db, item_id, payload)
