from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require
from app.models.catalog import Category
from app.schemas.catalog import CategoryCreate, CategoryOut, CategoryTreeNode, CategoryUpdate
from app.services import catalog_service
from app.utils import paginate

router = APIRouter()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate, db: Session = Depends(get_db), _user=Depends(require("catalog.manage"))
) -> Category:
    return catalog_service.create_category(db, payload)


@router.get("/tree", response_model=list[CategoryTreeNode])
def get_category_tree(
    dimension: str = Query(..., description="product_type | age_group | occasion"),
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.view")),
) -> list[Category]:
    """Nested AR+EN tree for one dimension — never a flat list."""
    return catalog_service.get_category_tree(db, dimension)


@router.get("")
def list_categories(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    dimension: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.view")),
) -> dict:
    """Cursor-paginated flat list on (created_at, id) descending. Filters: dimension, is_active."""
    stmt = select(Category).options(selectinload(Category.translations))
    if dimension is not None:
        stmt = stmt.where(Category.dimension == dimension)
    if is_active is not None:
        stmt = stmt.where(Category.is_active == is_active)
    items, next_cursor = paginate(db, stmt, Category, cursor, limit)
    catalog_service.attach_category_image_keys(db, items)
    return {"items": [CategoryOut.model_validate(c) for c in items], "next_cursor": next_cursor}


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(
    category_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))
) -> Category:
    return catalog_service.get_category(db, category_id)


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.manage")),
) -> Category:
    return catalog_service.update_category(db, category_id, payload)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def deactivate_category(
    category_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.manage"))
) -> None:
    catalog_service.deactivate_category(db, category_id)


# Permission keys used by this router: catalog.view, catalog.manage
