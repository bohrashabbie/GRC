from datetime import datetime

from sqlalchemy import BigInteger, CHAR, ForeignKey, Index, Integer, Numeric, TIMESTAMP, UniqueConstraint
from sqlalchemy.dialects.postgresql import CITEXT, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_number: Mapped[str] = mapped_column(nullable=False, unique=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    email: Mapped[str | None] = mapped_column(CITEXT, nullable=True)
    phone_e164: Mapped[str | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(nullable=False, default="pending")
    payment_status: Mapped[str] = mapped_column(nullable=False, default="unpaid")
    fulfilment_status: Mapped[str] = mapped_column(nullable=False, default="unfulfilled")
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False, default="SAR")
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    shipping_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tax_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    grand_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    coupon_code_snapshot: Mapped[str | None] = mapped_column(nullable=True)
    locale: Mapped[str] = mapped_column(nullable=False, default="ar")
    shipping_method_code: Mapped[str | None] = mapped_column(nullable=True)
    placed_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(nullable=True)
    # Set the first time this order's stock is put back (cancellation or full
    # refund) and never cleared. The idempotency guard: a restock only runs
    # while this is NULL, and stamping it happens in the same transaction as
    # the movement rows, so no order can ever restock twice.
    stock_restored_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_orders_customer_id", "customer_id"),
        Index("ix_orders_email", "email"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_payment_status", "payment_status"),
        Index("ix_orders_fulfilment_status", "fulfilment_status"),
        Index("ix_orders_placed_at", "placed_at"),
    )


class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    variant_id: Mapped[int] = mapped_column(ForeignKey("variants.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    sku_snapshot: Mapped[str] = mapped_column(nullable=False)
    name_snapshot: Mapped[str] = mapped_column(nullable=False)
    options_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    unit_price_snapshot: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate_snapshot: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    qty_fulfilled: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    qty_returned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")

    __table_args__ = (Index("ix_order_items_order_id", "order_id"),)


class OrderAddress(Base, TimestampMixin):
    __tablename__ = "order_addresses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(nullable=False)
    recipient_name: Mapped[str] = mapped_column(nullable=False)
    phone_e164: Mapped[str] = mapped_column(nullable=False)
    line1: Mapped[str] = mapped_column(nullable=False)
    line2: Mapped[str | None] = mapped_column(nullable=True)
    district: Mapped[str | None] = mapped_column(nullable=True)
    city: Mapped[str] = mapped_column(nullable=False)
    region_name: Mapped[str] = mapped_column(nullable=False)
    postal_code: Mapped[str | None] = mapped_column(nullable=True)
    country_code: Mapped[str] = mapped_column(CHAR(2), nullable=False, default="SA")
    national_short_address: Mapped[str | None] = mapped_column(CHAR(8), nullable=True)

    __table_args__ = (
        Index("ix_order_addresses_order_id", "order_id"),
        UniqueConstraint("order_id", "type", name="uq_order_addresses_order_type"),
    )


class OrderStatusHistory(Base, TimestampMixin):
    __tablename__ = "order_status_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    field: Mapped[str] = mapped_column(nullable=False)
    from_value: Mapped[str | None] = mapped_column(nullable=True)
    to_value: Mapped[str] = mapped_column(nullable=False)
    actor_type: Mapped[str] = mapped_column(nullable=False)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reason: Mapped[str | None] = mapped_column(nullable=True)

    __table_args__ = (Index("ix_order_status_history_order_id", "order_id"),)


class OrderNote(Base, TimestampMixin):
    __tablename__ = "order_notes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    author_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    body: Mapped[str] = mapped_column(nullable=False)
    is_customer_visible: Mapped[bool] = mapped_column(nullable=False, default=False)

    __table_args__ = (Index("ix_order_notes_order_id", "order_id"),)


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    provider: Mapped[str] = mapped_column(nullable=False)
    provider_payment_id: Mapped[str | None] = mapped_column(nullable=True)
    method: Mapped[str | None] = mapped_column(nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False, default="SAR")
    status: Mapped[str] = mapped_column(nullable=False, default="initiated")
    idempotency_key: Mapped[str] = mapped_column(nullable=False, unique=True)
    authorised_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index("ix_payments_order_id", "order_id"),
        Index("ix_payments_status", "status"),
        UniqueConstraint("provider", "provider_payment_id", name="uq_payments_provider_payment_id"),
    )


class PaymentRefund(Base, TimestampMixin):
    __tablename__ = "payment_refunds"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"), nullable=False)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    return_id: Mapped[int | None] = mapped_column(
        ForeignKey("returns.id", use_alter=True, name="fk_payment_refunds_return_id"),
        nullable=True,
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(nullable=True)
    provider_refund_id: Mapped[str | None] = mapped_column(nullable=True, unique=True)
    status: Mapped[str] = mapped_column(nullable=False, default="pending")
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    __table_args__ = (
        Index("ix_payment_refunds_payment_id", "payment_id"),
        Index("ix_payment_refunds_order_id", "order_id"),
        Index("ix_payment_refunds_status", "status"),
    )


class Shipment(Base, TimestampMixin):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    carrier_id: Mapped[int] = mapped_column(ForeignKey("carriers.id"), nullable=False)
    from_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    tracking_number: Mapped[str | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(nullable=False, default="pending")
    label_storage_key: Mapped[str | None] = mapped_column(nullable=True)
    cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    shipped_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    items: Mapped[list["ShipmentItem"]] = relationship(
        back_populates="shipment", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_shipments_order_id", "order_id"),
        Index("ix_shipments_tracking_number", "tracking_number"),
        Index("ix_shipments_status", "status"),
    )


class ShipmentItem(Base, TimestampMixin):
    __tablename__ = "shipment_items"

    shipment_id: Mapped[int] = mapped_column(
        ForeignKey("shipments.id", ondelete="CASCADE"), primary_key=True
    )
    order_item_id: Mapped[int] = mapped_column(ForeignKey("order_items.id"), primary_key=True)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)

    shipment: Mapped["Shipment"] = relationship(back_populates="items")


class Return(Base, TimestampMixin):
    __tablename__ = "returns"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    rma_number: Mapped[str] = mapped_column(nullable=False, unique=True)
    type: Mapped[str] = mapped_column(nullable=False, default="return")
    status: Mapped[str] = mapped_column(nullable=False, default="requested")
    channel: Mapped[str] = mapped_column(nullable=False, default="online")
    reason_code: Mapped[str] = mapped_column(nullable=False)
    received_location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True)
    refund_id: Mapped[int | None] = mapped_column(ForeignKey("payment_refunds.id"), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    received_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    items: Mapped[list["ReturnItem"]] = relationship(back_populates="return_", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_returns_order_id", "order_id"),
        Index("ix_returns_status", "status"),
    )


class ReturnItem(Base, TimestampMixin):
    __tablename__ = "return_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    return_id: Mapped[int] = mapped_column(ForeignKey("returns.id", ondelete="CASCADE"), nullable=False)
    order_item_id: Mapped[int] = mapped_column(ForeignKey("order_items.id"), nullable=False)
    variant_id: Mapped[int] = mapped_column(ForeignKey("variants.id"), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    condition: Mapped[str | None] = mapped_column(nullable=True)
    restock: Mapped[bool] = mapped_column(nullable=False, default=False)

    return_: Mapped["Return"] = relationship(back_populates="items")

    __table_args__ = (Index("ix_return_items_return_id", "return_id"),)
