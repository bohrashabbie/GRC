from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.customers import Customer, CustomerAddress
from app.schemas.customer import (
    CustomerAddressCreate,
    CustomerAddressOut,
    CustomerAddressUpdate,
    CustomerOut,
    CustomerUpdate,
)
from app.services import customer_service
from app.utils import paginate

router = APIRouter()


@router.get("")
def list_customers(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("customer.view")),
) -> dict:
    stmt = select(Customer)
    if is_active is not None:
        stmt = stmt.where(Customer.is_active == is_active)
    items, next_cursor = paginate(db, stmt, Customer, cursor, limit)
    return {"items": [CustomerOut.model_validate(c) for c in items], "next_cursor": next_cursor}


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db), _user=Depends(require("customer.view"))) -> Customer:
    return customer_service.get_customer(db, customer_id)


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db), _user=Depends(require("customer.update"))
) -> Customer:
    return customer_service.update_customer(db, customer_id, payload)


@router.get("/{customer_id}/addresses", response_model=list[CustomerAddressOut])
def list_addresses(
    customer_id: int, db: Session = Depends(get_db), _user=Depends(require("customer.view"))
) -> list[CustomerAddress]:
    return customer_service.get_customer(db, customer_id).addresses


@router.post("/{customer_id}/addresses", response_model=CustomerAddressOut, status_code=status.HTTP_201_CREATED)
def create_address(
    customer_id: int,
    payload: CustomerAddressCreate,
    db: Session = Depends(get_db),
    _user=Depends(require("customer.update")),
) -> CustomerAddress:
    return customer_service.create_address(db, customer_id, payload)


@router.patch("/addresses/{address_id}", response_model=CustomerAddressOut)
def update_address(
    address_id: int, payload: CustomerAddressUpdate, db: Session = Depends(get_db), _user=Depends(require("customer.update"))
) -> CustomerAddress:
    return customer_service.update_address(db, address_id, payload)


# Permission keys used by this router: customer.view, customer.update
