from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Computed, ForeignKey, Index, Integer, Numeric, SmallInteger, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, TimestampMixin


class Location(Base, TimestampMixin):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    type: Mapped[str] = mapped_column(nullable=False)
    name_ar: Mapped[str] = mapped_column(nullable=False)
    name_en: Mapped[str] = mapped_column(nullable=False)
    is_sellable_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    fulfilment_priority: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("ix_locations_type", "type"),
        Index("ix_locations_is_sellable_online", "is_sellable_online"),
        Index("ix_locations_is_active", "is_active"),
    )


class StockLevel(Base):
    """on_hand/reserved/incoming are a cached projection of stock_movements — the ledger is the
    source of truth. Only inventory_service may write this table, always alongside a
    stock_movements row in the same transaction."""

    __tablename__ = "stock_levels"

    variant_id: Mapped[int] = mapped_column(
        ForeignKey("variants.id", ondelete="CASCADE"), primary_key=True
    )
    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True
    )
    on_hand: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reserved: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    incoming: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    safety_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)


class StockMovement(Base, CreatedAtMixin):
    """The ledger. Append-only, never updated."""

    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    variant_id: Mapped[int] = mapped_column(ForeignKey("variants.id"), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    qty_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(nullable=False)
    ref_type: Mapped[str | None] = mapped_column(nullable=True)
    ref_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    unit_cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    balance_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index("ix_stock_movements_variant_id", "variant_id"),
        Index("ix_stock_movements_location_id", "location_id"),
        Index("ix_stock_movements_reason", "reason"),
        Index("ix_stock_movements_ref_id", "ref_id"),
        Index("ix_stock_movements_created_at", "created_at"),
    )


class StockTransfer(Base, TimestampMixin):
    __tablename__ = "stock_transfers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    transfer_number: Mapped[str] = mapped_column(nullable=False, unique=True)
    from_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    to_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    status: Mapped[str] = mapped_column(nullable=False, default="draft")
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    dispatched_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    note: Mapped[str | None] = mapped_column(nullable=True)

    items: Mapped[list["StockTransferItem"]] = relationship(
        back_populates="transfer", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_stock_transfers_from_location_id", "from_location_id"),
        Index("ix_stock_transfers_to_location_id", "to_location_id"),
        Index("ix_stock_transfers_status", "status"),
    )


class StockTransferItem(Base):
    __tablename__ = "stock_transfer_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    transfer_id: Mapped[int] = mapped_column(
        ForeignKey("stock_transfers.id", ondelete="CASCADE"), nullable=False
    )
    variant_id: Mapped[int] = mapped_column(ForeignKey("variants.id"), nullable=False)
    qty_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    qty_dispatched: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    qty_received: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    transfer: Mapped["StockTransfer"] = relationship(back_populates="items")

    __table_args__ = (Index("ix_stock_transfer_items_transfer_id", "transfer_id"),)


class StockCount(Base, TimestampMixin):
    __tablename__ = "stock_counts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    count_number: Mapped[str] = mapped_column(nullable=False, unique=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    scope: Mapped[str] = mapped_column(nullable=False)
    scope_filter: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(nullable=False, default="open")
    started_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    approved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    applied_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    items: Mapped[list["StockCountItem"]] = relationship(
        back_populates="stock_count", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_stock_counts_location_id", "location_id"),
        Index("ix_stock_counts_status", "status"),
    )


class StockCountItem(Base):
    __tablename__ = "stock_count_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_count_id: Mapped[int] = mapped_column(
        ForeignKey("stock_counts.id", ondelete="CASCADE"), nullable=False
    )
    variant_id: Mapped[int] = mapped_column(ForeignKey("variants.id"), nullable=False)
    system_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    counted_qty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    variance: Mapped[int | None] = mapped_column(
        Integer, Computed("counted_qty - system_qty", persisted=True), nullable=True
    )
    counted_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    counted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    stock_count: Mapped["StockCount"] = relationship(back_populates="items")

    __table_args__ = (Index("ix_stock_count_items_stock_count_id", "stock_count_id"),)
