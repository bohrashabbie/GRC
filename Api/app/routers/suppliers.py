from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.purchasing import Supplier
from app.schemas.purchasing import SupplierCreate, SupplierOut, SupplierUpdate
from app.services import purchasing_service
from app.utils import paginate

router = APIRouter()


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate, db: Session = Depends(get_db), _user=Depends(require("supplier.manage"))
) -> Supplier:
    return purchasing_service.create_supplier(db, payload)


@router.get("")
def list_suppliers(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("inventory.view")),
) -> dict:
    stmt = select(Supplier)
    if is_active is not None:
        stmt = stmt.where(Supplier.is_active == is_active)
    items, next_cursor = paginate(db, stmt, Supplier, cursor, limit)
    return {"items": [SupplierOut.model_validate(s) for s in items], "next_cursor": next_cursor}


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(
    supplier_id: int, db: Session = Depends(get_db), _user=Depends(require("inventory.view"))
) -> Supplier:
    return purchasing_service.get_supplier(db, supplier_id)


@router.patch("/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: int, payload: SupplierUpdate, db: Session = Depends(get_db), _user=Depends(require("supplier.manage"))
) -> Supplier:
    return purchasing_service.update_supplier(db, supplier_id, payload)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def deactivate_supplier(
    supplier_id: int, db: Session = Depends(get_db), _user=Depends(require("supplier.manage"))
) -> None:
    purchasing_service.deactivate_supplier(db, supplier_id)


# Permission keys used by this router: supplier.manage, inventory.view
