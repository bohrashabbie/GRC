"""retire legacy option values behind option_values.is_active

Revision ID: c7e1a4d3b920
Revises: b6d4c8e9f210
Create Date: 2026-07-28 21:10:00.000000

Staff can now add their own Colour *and* Size values, which the admin list has
to show. Until now that list was a hardcoded allow-list of the five seeded size
codes -- fine while sizes were fixed, useless the moment someone adds a sixth,
because a newly created value would not be in the list and would vanish.

So the allow-list moves into the data as a flag. Everything is active by
default; this migration then retires exactly what the old hardcoded filter was
hiding:

  - values on options other than the canonical colour/size rows, which is where
    the pre-GR8 demo seed left `length`, and `color` when a `colour` row
    already existed and the rename in b6d4c8e9f210 therefore skipped it
  - values on the canonical size option that are not one of the five seeded
    codes, i.e. the demo `size-37`..`size-45`, `52`..`62` and `size-s`..`size-xxl`

Nothing is deleted: variants reference these rows (Hard Rule 4), and an order
placed against one must still be able to name what was bought. Deactivated only
means the admin stops offering it on new products.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c7e1a4d3b920"
down_revision: Union[str, None] = "b6d4c8e9f210"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "option_values",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    op.execute(
        """
        UPDATE option_values AS value_row
        SET is_active = false, updated_at = now()
        FROM options AS option_row
        WHERE option_row.id = value_row.option_id
          AND option_row.code NOT IN ('colour', 'size')
        """
    )

    op.execute(
        """
        UPDATE option_values AS value_row
        SET is_active = false, updated_at = now()
        FROM options AS option_row
        WHERE option_row.id = value_row.option_id
          AND option_row.code = 'size'
          AND value_row.code NOT IN ('140', '150', 's', 'm', 'l')
        """
    )


def downgrade() -> None:
    op.drop_column("option_values", "is_active")
