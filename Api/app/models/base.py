from datetime import datetime

from sqlalchemy import TIMESTAMP, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import UserDefinedType


class Base(DeclarativeBase):
    pass


class LTREE(UserDefinedType):
    """Postgres ltree column, bound/read as a plain dotted string (e.g. 'thobes.white.classic')."""

    cache_ok = True

    def get_col_spec(self, **kw) -> str:
        return "LTREE"


class TimestampMixin:
    """created_at/updated_at per workbook Convention 1. Omit on pure append-only ledgers."""

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class CreatedAtMixin:
    """For append-only ledgers (audit_log, stock_movements): no updated_at, rows are never mutated."""

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
