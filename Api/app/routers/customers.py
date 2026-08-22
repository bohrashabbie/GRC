from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.middleware.error import ValidationAppError
from app.models.customers import Customer, CustomerAddress
from app.models.orders import Order
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
    q: str | None = Query(None, description="Name, email or phone"),
    segment: str | None = Query(
        None, description="purchased | registered | pending | marketing"
    ),
    db: Session = Depends(get_db),
    _user=Depends(require("customer.view")),
) -> dict:
    """Cursor-paginated on (created_at, id) descending.

    `segment` is the question staff actually ask of this list: who has bought
    (at least one order that was not cancelled), who registered but never has,
    who has something open right now, and who agreed to be marketed to.
    """
    stmt = select(Customer)
    if is_active is not None:
        stmt = stmt.where(Customer.is_active == is_active)

    if q and q.strip():
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Customer.first_name.ilike(needle),
                Customer.last_name.ilike(needle),
                Customer.email.ilike(needle),
                Customer.phone_e164.ilike(needle),
            )
        )

    has_order = select(Order.id).where(
        Order.customer_id == Customer.id, Order.status != "cancelled"
    )
    if segment == "purchased":
        stmt = stmt.where(has_order.exists())
    elif segment == "registered":
        # Registered, not yet a buyer — the list worth sending a first-order
        # nudge to.
        stmt = stmt.where(~has_order.exists())
    elif segment == "pending":
        stmt = stmt.where(
            select(Order.id)
            .where(
                Order.customer_id == Customer.id,
                Order.status.in_(customer_service.OPEN_ORDER_STATUSES),
            )
            .exists()
        )
    elif segment == "marketing":
        stmt = stmt.where(Customer.accepts_marketing.is_(True))
    elif segment is not None:
        raise ValidationAppError(
            f"Unknown customer segment '{segment}'.",
            details={"allowed": ["purchased", "registered", "pending", "marketing"]},
        )

    items, next_cursor = paginate(db, stmt, Customer, cursor, limit)
    customer_service.attach_order_summary(db, items)
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
