from datetime import date, datetime

from sqlalchemy import BigInteger, CHAR, Date, ForeignKey, Index, Integer, Numeric, SmallInteger, TIMESTAMP
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    name: Mapped[str] = mapped_column(nullable=False)
    contact_name: Mapped[str | None] = mapped_column(nullable=True)
    email: Mapped[str | None] = mapped_column(CITEXT, nullable=True)
    phone_e164: Mapped[str | None] = mapped_column(nullable=True)
    address: Mapped[str | None] = mapped_column(nullable=True)
    vat_number: Mapped[str | None] = mapped_column(nullable=True)
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False, default="KWD")
    payment_terms_days: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    default_lead_time_days: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)

    __table_args__ = (Index("ix_suppliers_is_active", "is_active"),)


class PurchaseOrder(Base, TimestampMixin):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    po_number: Mapped[str] = mapped_column(nullable=False, unique=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    destination_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    status: Mapped[str] = mapped_column(nullable=False, default="draft")
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False, default="KWD")
    exchange_rate: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    tax_total: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    shipping_cost: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    expected_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    approved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    items: Mapped[list["PurchaseOrderItem"]] = relationship(
        back_populates="purchase_order", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_purchase_orders_supplier_id", "supplier_id"),
        Index("ix_purchase_orders_status", "status"),
        Index("ix_purchase_orders_expected_at", "expected_at"),
    )


class PurchaseOrderItem(Base, TimestampMixin):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False
    )
    variant_id: Mapped[int] = mapped_column(ForeignKey("variants.id"), nullable=False)
    qty_ordered: Mapped[int] = mapped_column(Integer, nullable=False)
    qty_received: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="items")

    __table_args__ = (Index("ix_purchase_order_items_purchase_order_id", "purchase_order_id"),)


class GoodsReceipt(Base, TimestampMixin):
    __tablename__ = "goods_receipts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    receipt_number: Mapped[str] = mapped_column(nullable=False, unique=True)
    purchase_order_id: Mapped[int | None] = mapped_column(
        ForeignKey("purchase_orders.id"), nullable=True
    )
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    supplier_invoice_number: Mapped[str | None] = mapped_column(nullable=True)
    received_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    received_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    note: Mapped[str | None] = mapped_column(nullable=True)

    items: Mapped[list["GoodsReceiptItem"]] = relationship(
        back_populates="goods_receipt", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_goods_receipts_purchase_order_id", "purchase_order_id"),
        Index("ix_goods_receipts_received_at", "received_at"),
    )


class GoodsReceiptItem(Base, TimestampMixin):
    __tablename__ = "goods_receipt_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    goods_receipt_id: Mapped[int] = mapped_column(
        ForeignKey("goods_receipts.id", ondelete="CASCADE"), nullable=False
    )
    purchase_order_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("purchase_order_items.id"), nullable=True
    )
    variant_id: Mapped[int] = mapped_column(ForeignKey("variants.id"), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    qty_rejected: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_cost: Mapped[float | None] = mapped_column(Numeric(12, 3), nullable=True)

    goods_receipt: Mapped["GoodsReceipt"] = relationship(back_populates="items")

    __table_args__ = (Index("ix_goods_receipt_items_goods_receipt_id", "goods_receipt_id"),)
