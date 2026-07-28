"""add simple inventory tracking

Simple, one-number-per-variant stock tracking layered over the existing
stock_levels/stock_movements ledger rather than beside it — the ledger stays
the source of truth (Hard Rule 2), and "the number" is on_hand at the single
default online-sellable location.

Two columns:

  products.track_inventory   - false means the product is always purchasable
                               and its stock number is ignored (made-to-order,
                               digital). Defaults true.
  orders.stock_restored_at   - idempotency stamp for putting stock back on
                               cancellation/refund. Non-null means it already
                               happened, so an order can never restock twice.

No backfill of quantities: a variant with no stock_levels row reads as 0, and
existing on_hand rows are left exactly as they are because under this design
they *are* the stored quantity.

Revision ID: d5e2a71c9f40
Revises: c3b81f5e2a04
Create Date: 2026-07-28 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d5e2a71c9f40"
down_revision: Union[str, None] = "c3b81f5e2a04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default so the NOT NULL applies to rows that already exist, then
    # dropped so the application layer owns the value — same pattern as
    # is_best_seller.
    op.add_column(
        "products",
        sa.Column(
            "track_inventory",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.alter_column("products", "track_inventory", server_default=None)

    op.add_column(
        "orders",
        sa.Column("stock_restored_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "stock_restored_at")
    op.drop_column("products", "track_inventory")
