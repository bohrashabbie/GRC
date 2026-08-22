from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.catalog import ProductType
from app.schemas.catalog import ProductTypeCreate, ProductTypeOut, ProductTypeUpdate
from app.schemas.common import DeletionResultOut
from app.services import catalog_service

router = APIRouter()


@router.post("", response_model=ProductTypeOut, status_code=status.HTTP_201_CREATED)
def create_product_type(
    payload: ProductTypeCreate,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.manage")),
) -> ProductType:
    return catalog_service.create_product_type(db, payload)


@router.get("", response_model=list[ProductTypeOut])
def list_product_types(
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.view")),
) -> list[ProductType]:
    """Every type in display order, each with how many products carry it.

    Not cursor-paginated: this is a short vocabulary list (four rows today),
    and the product form needs all of it at once to build its dropdown.
    """
    return catalog_service.list_product_types(db, is_active=is_active)


@router.get("/{product_type_id}", response_model=ProductTypeOut)
def get_product_type(
    product_type_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))
) -> ProductType:
    return catalog_service.get_product_type(db, product_type_id)


@router.patch("/{product_type_id}", response_model=ProductTypeOut)
def update_product_type(
    product_type_id: int,
    payload: ProductTypeUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.manage")),
) -> ProductType:
    return catalog_service.update_product_type(db, product_type_id, payload)


@router.delete("/{product_type_id}", response_model=DeletionResultOut)
def delete_product_type(
    product_type_id: int, db: Session = Depends(get_db), user=Depends(require("catalog.manage"))
) -> DeletionResultOut:
    """Refuses while products still carry the type, saying how many — the code
    lives on those products as text, so removing it would strand them."""
    result = catalog_service.delete_product_type(db, product_type_id, actor_user_id=user.id)
    return DeletionResultOut(mode=result.mode, blockers=result.blockers)


# Permission keys used by this router: catalog.view, catalog.manage
