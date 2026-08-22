from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import NotFoundError
from app.models.customers import Customer, CustomerAddress
from app.models.orders import Order


# An order that has not reached the end of its life yet — what staff mean by
# "pending orders": something is owed to this customer.
OPEN_ORDER_STATUSES = ("pending", "confirmed", "processing")


def attach_order_summary(db: Session, customers: list) -> None:
    """Order count, open-order count, lifetime spend and last order date for a
    page of customers, in one grouped query rather than one per row."""
    ids = [customer.id for customer in customers]
    if not ids:
        return
    rows = db.execute(
        select(
            Order.customer_id,
            func.count(Order.id),
            func.count(Order.id).filter(Order.status.in_(OPEN_ORDER_STATUSES)),
            func.coalesce(func.sum(Order.grand_total), 0),
            func.max(Order.placed_at),
        )
        .where(Order.customer_id.in_(ids), Order.status != "cancelled")
        .group_by(Order.customer_id)
    ).all()
    summary = {
        row[0]: {"count": row[1], "open": row[2], "spent": row[3], "last": row[4]}
        for row in rows
    }
    for customer in customers:
        found = summary.get(customer.id)
        customer.order_count = found["count"] if found else 0
        customer.pending_order_count = found["open"] if found else 0
        customer.total_spent = found["spent"] if found else 0
        customer.last_order_at = found["last"] if found else None


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id, options=[selectinload(Customer.addresses)])
    if customer is None:
        raise NotFoundError("Customer not found")
    return customer


def update_customer(db: Session, customer_id: int, data) -> Customer:
    customer = get_customer(db, customer_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


def _clear_other_defaults(db: Session, customer_id: int, field: str, exclude_id: int | None) -> None:
    query = db.query(CustomerAddress).filter(CustomerAddress.customer_id == customer_id, getattr(CustomerAddress, field).is_(True))
    if exclude_id is not None:
        query = query.filter(CustomerAddress.id != exclude_id)
    for addr in query:
        setattr(addr, field, False)


def create_address(db: Session, customer_id: int, data) -> CustomerAddress:
    if get_customer(db, customer_id) is None:
        raise NotFoundError("Customer not found")
    address = CustomerAddress(customer_id=customer_id, **data.model_dump())
    db.add(address)
    db.flush()
    if address.is_default_shipping:
        _clear_other_defaults(db, customer_id, "is_default_shipping", address.id)
    if address.is_default_billing:
        _clear_other_defaults(db, customer_id, "is_default_billing", address.id)
    db.commit()
    db.refresh(address)
    return address


def get_address(db: Session, address_id: int) -> CustomerAddress:
    address = db.get(CustomerAddress, address_id)
    if address is None:
        raise NotFoundError("Address not found")
    return address


def update_address(db: Session, address_id: int, data) -> CustomerAddress:
    address = get_address(db, address_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(address, field, value)
    if data.is_default_shipping:
        _clear_other_defaults(db, address.customer_id, "is_default_shipping", address.id)
    if data.is_default_billing:
        _clear_other_defaults(db, address.customer_id, "is_default_billing", address.id)
    db.commit()
    db.refresh(address)
    return address
