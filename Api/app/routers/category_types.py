from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.catalog import CategoryType
from app.schemas.catalog import CategoryTypeCreate, CategoryTypeOut, CategoryTypeUpdate
from app.schemas.common import DeletionResultOut
from app.services import catalog_service

router = APIRouter()


@router.post("", response_model=CategoryTypeOut, status_code=status.HTTP_201_CREATED)
def create_category_type(
    payload: CategoryTypeCreate,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.manage")),
) -> CategoryType:
    return catalog_service.create_category_type(db, payload)


@router.get("", response_model=list[CategoryTypeOut])
def list_category_types(
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.view")),
) -> list[CategoryType]:
    """Every type in display order, each with how many categories use it.

    Not cursor-paginated: three rows today, and the categories page needs the
    whole list at once to build its tree switcher.
    """
    return catalog_service.list_category_types(db, is_active=is_active)


@router.get("/{category_type_id}", response_model=CategoryTypeOut)
def get_category_type(
    category_type_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))
) -> CategoryType:
    return catalog_service.get_category_type(db, category_type_id)


@router.patch("/{category_type_id}", response_model=CategoryTypeOut)
def update_category_type(
    category_type_id: int,
    payload: CategoryTypeUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.manage")),
) -> CategoryType:
    return catalog_service.update_category_type(db, category_type_id, payload)


@router.delete("/{category_type_id}", response_model=DeletionResultOut)
def delete_category_type(
    category_type_id: int, db: Session = Depends(get_db), user=Depends(require("catalog.manage"))
) -> DeletionResultOut:
    """Refuses while categories are still filed under the type, saying how
    many — the code lives on those categories as text."""
    result = catalog_service.delete_category_type(db, category_type_id, actor_user_id=user.id)
    return DeletionResultOut(mode=result.mode, blockers=result.blockers)


# Permission keys used by this router: catalog.view, catalog.manage
