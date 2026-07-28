"""add wishlist_items

A shopper's saved products. The workbook models this as wishlists +
wishlist_items, a named-list design that only pays for itself when someone can
keep more than one list; the storefront has a single heart and a single
wishlist page, so one join table carries the same meaning. Splitting it later
is additive.

The composite primary key is the deduplication: hearting the same product twice
is the same row, so the endpoint can be idempotent without a read-then-write.

Revision ID: e7c31b8fa204
Revises: d5e2a71c9f40
Create Date: 2026-07-28 15:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e7c31b8fa204"
down_revision: Union[str, None] = "d5e2a71c9f40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "wishlist_items",
        sa.Column(
            "customer_id",
            sa.BigInteger(),
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "product_id",
            sa.BigInteger(),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_wishlist_items_customer_id", "wishlist_items", ["customer_id"])


def downgrade() -> None:
    op.drop_index("ix_wishlist_items_customer_id", table_name="wishlist_items")
    op.drop_table("wishlist_items")
