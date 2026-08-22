"""let staff choose which categories appear on the home page

Revision ID: b5d93e7a41c6
Revises: a3f7c15e9d28
Create Date: 2026-08-22 11:00:00.000000

The home page's "Shop by category" row rendered every active top-level
category, so the only way to keep one out of it was to deactivate the category
or delete it — which also took it off the storefront entirely. This is a
separate switch: the header menu stays as it is, and the row is chosen.

Existing top-level categories are switched on so the page looks exactly as it
does today; children default to off, because the row has only ever shown roots.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b5d93e7a41c6"
down_revision: Union[str, None] = "a3f7c15e9d28"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column(
            "show_on_home",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.execute(
        "UPDATE categories SET show_on_home = true WHERE parent_id IS NULL AND is_active"
    )


def downgrade() -> None:
    op.drop_column("categories", "show_on_home")
