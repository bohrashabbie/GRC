"""add is_best_seller to products

Adds a hand-set merchandising flag, kept separate from is_featured:
"featured" is editorial promotion, "best seller" drives the storefront's
best_sellers collection and its product badge.

Revision ID: a1c7e9d24b30
Revises: 04f50a7431fd
Create Date: 2026-07-26 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1c7e9d24b30"
down_revision: Union[str, None] = "04f50a7431fd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default so the NOT NULL applies to rows that already exist; the
    # default is then dropped so the application layer owns the value from
    # here on, matching how is_featured behaves.
    op.add_column(
        "products",
        sa.Column(
            "is_best_seller",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.alter_column("products", "is_best_seller", server_default=None)
    op.create_index("ix_products_is_best_seller", "products", ["is_best_seller"])


def downgrade() -> None:
    op.drop_index("ix_products_is_best_seller", table_name="products")
    op.drop_column("products", "is_best_seller")
