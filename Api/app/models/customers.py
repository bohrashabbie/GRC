from datetime import datetime

from sqlalchemy import CHAR, Boolean, ForeignKey, Index, BigInteger, TIMESTAMP
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str | None] = mapped_column(CITEXT, nullable=True, unique=True)
    phone_e164: Mapped[str | None] = mapped_column(nullable=True, unique=True)
    password_hash: Mapped[str | None] = mapped_column(nullable=True)
    first_name: Mapped[str | None] = mapped_column(nullable=True)
    last_name: Mapped[str | None] = mapped_column(nullable=True)
    locale_pref: Mapped[str] = mapped_column(nullable=False, default="ar")
    accepts_marketing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    phone_verified_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    addresses: Mapped[list["CustomerAddress"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_customers_is_active", "is_active"),)


class CustomerAddress(Base, TimestampMixin):
    __tablename__ = "customer_addresses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str | None] = mapped_column(nullable=True)
    recipient_name: Mapped[str] = mapped_column(nullable=False)
    phone_e164: Mapped[str] = mapped_column(nullable=False)
    line1: Mapped[str] = mapped_column(nullable=False)
    line2: Mapped[str | None] = mapped_column(nullable=True)
    district: Mapped[str | None] = mapped_column(nullable=True)
    city: Mapped[str] = mapped_column(nullable=False)
    region_id: Mapped[int] = mapped_column(ForeignKey("regions.id"), nullable=False)
    postal_code: Mapped[str | None] = mapped_column(nullable=True)
    country_code: Mapped[str] = mapped_column(CHAR(2), nullable=False, default="SA")
    national_short_address: Mapped[str | None] = mapped_column(CHAR(8), nullable=True)
    is_default_shipping: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_default_billing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    customer: Mapped["Customer"] = relationship(back_populates="addresses")

    __table_args__ = (Index("ix_customer_addresses_customer_id", "customer_id"),)
