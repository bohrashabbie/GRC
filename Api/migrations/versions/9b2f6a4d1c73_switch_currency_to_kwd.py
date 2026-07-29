"""switch currency to KWD and widen money columns to 3 decimals

The store trades in Kuwaiti Dinar, not the Saudi Riyal the schema was
originally scaffolded with (regions were already reseeded for Kuwait in
f2a94d1c7e38). KWD is subdivided into 1000 fils and is conventionally shown
with 3 decimal places, so every NUMERIC(12,2) money column widens to
NUMERIC(12,3) alongside the currency default/data change -- fils would
otherwise be silently rounded away.

Revision ID: 9b2f6a4d1c73
Revises: c7e1a4d3b920
Create Date: 2026-07-29 09:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "9b2f6a4d1c73"
down_revision: Union[str, None] = "c7e1a4d3b920"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_MONEY_COLUMNS = [
    ("products", "base_price"),
    ("variants", "price"),
    ("variants", "compare_at_price"),
    ("variants", "cost_price"),
    ("stock_movements", "unit_cost"),
    ("orders", "subtotal"),
    ("orders", "discount_total"),
    ("orders", "shipping_total"),
    ("orders", "tax_total"),
    ("orders", "grand_total"),
    ("order_items", "unit_price_snapshot"),
    ("order_items", "line_total"),
    ("payments", "amount"),
    ("payment_refunds", "amount"),
    ("shipments", "cost"),
    ("purchase_orders", "subtotal"),
    ("purchase_orders", "tax_total"),
    ("purchase_orders", "shipping_cost"),
    ("purchase_orders", "total"),
    ("purchase_order_items", "unit_cost"),
    ("purchase_order_items", "line_total"),
    ("goods_receipt_items", "unit_cost"),
]

_CURRENCY_COLUMNS = [
    ("orders", "currency"),
    ("payments", "currency"),
    ("suppliers", "currency"),
    ("purchase_orders", "currency"),
]


def upgrade() -> None:
    for table, column in _MONEY_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=sa.Numeric(12, 3),
            existing_type=sa.Numeric(12, 2),
        )

    for table, column in _CURRENCY_COLUMNS:
        op.execute(f"UPDATE {table} SET currency = 'KWD' WHERE currency = 'SAR'")
        op.alter_column(table, column, server_default="KWD")


def downgrade() -> None:
    for table, column in _CURRENCY_COLUMNS:
        op.alter_column(table, column, server_default="SAR")
        op.execute(f"UPDATE {table} SET currency = 'SAR' WHERE currency = 'KWD'")

    for table, column in _MONEY_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=sa.Numeric(12, 2),
            existing_type=sa.Numeric(12, 3),
        )
