from __future__ import annotations

from sqlalchemy.orm import Session, selectinload

from app.middleware.error import NotFoundError
from app.models.customers import Customer, CustomerAddress


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
