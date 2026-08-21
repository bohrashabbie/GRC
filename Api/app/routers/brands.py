from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require
from app.models.catalog import Brand
from app.schemas.catalog import BrandCreate, BrandOut, BrandUpdate
from app.schemas.common import DeletionResultOut
from app.services import catalog_service
from app.utils import paginate

router = APIRouter()


@router.post("", response_model=BrandOut, status_code=status.HTTP_201_CREATED)
def create_brand(
    payload: BrandCreate, db: Session = Depends(get_db), _user=Depends(require("catalog.manage"))
) -> Brand:
    return catalog_service.create_brand(db, payload)


@router.get("")
def list_brands(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.view")),
) -> dict:
    """Cursor-paginated on (created_at, id) descending. Filters: is_active."""
    stmt = select(Brand).options(selectinload(Brand.translations))
    if is_active is not None:
        stmt = stmt.where(Brand.is_active == is_active)
    items, next_cursor = paginate(db, stmt, Brand, cursor, limit)
    catalog_service.attach_brand_logo_keys(db, items)
    return {"items": [BrandOut.model_validate(b) for b in items], "next_cursor": next_cursor}


@router.get("/{brand_id}", response_model=BrandOut)
def get_brand(brand_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))) -> Brand:
    brand = catalog_service.get_brand(db, brand_id)
    catalog_service.attach_brand_logo_keys(db, [brand])
    return brand


@router.patch("/{brand_id}", response_model=BrandOut)
def update_brand(
    brand_id: int, payload: BrandUpdate, db: Session = Depends(get_db), _user=Depends(require("catalog.manage"))
) -> Brand:
    return catalog_service.update_brand(db, brand_id, payload)


@router.delete("/{brand_id}", response_model=DeletionResultOut)
def delete_brand(
    brand_id: int, db: Session = Depends(get_db), user=Depends(require("catalog.manage"))
) -> DeletionResultOut:
    """Removes the brand, or deactivates it when products still use it. The
    response says which, so the admin can explain the fallback."""
    result = catalog_service.delete_brand(db, brand_id, actor_user_id=user.id)
    return DeletionResultOut(mode=result.mode, blockers=result.blockers)


# Permission keys used by this router: catalog.view, catalog.manage
