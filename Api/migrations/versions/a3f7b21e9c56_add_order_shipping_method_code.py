"""add orders.shipping_method_code

The model carried this column with no migration behind it, so every ORM read of
an order failed with UndefinedColumn — which took out the whole account orders
section. Recording which method was chosen also lets an order's detail page
name its shipping option without guessing from the amount charged.

Nullable, because orders placed before this column existed genuinely have no
answer, and inventing "standard" for them would be a guess presented as fact.

Revision ID: a3f7b21e9c56
Revises: f2a94d1c7e38
Create Date: 2026-07-28 18:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a3f7b21e9c56"
down_revision: Union[str, None] = "f2a94d1c7e38"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("shipping_method_code", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "shipping_method_code")
