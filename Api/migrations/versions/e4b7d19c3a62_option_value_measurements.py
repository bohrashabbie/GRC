"""give size option values a garment length and width in cm

Revision ID: e4b7d19c3a62
Revises: b8e4d2f7a951
Create Date: 2026-08-03 12:00:00.000000

A size label like "56" tells a shopper nothing about the actual garment, so
each size value can now state the measurements it stands for: thobe length and
chest width, whole centimetres. Both are nullable — colour values never carry
them (the same asymmetry as hex_color, which sizes never carry), and a size
whose measurements staff have not filled in yet simply shows none.

The two seeded cm sizes already state their length in their code ("140",
"150"), so those are backfilled; widths stay NULL until staff enter them.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e4b7d19c3a62"
down_revision: Union[str, None] = "b8e4d2f7a951"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("option_values", sa.Column("length_cm", sa.Integer(), nullable=True))
    op.add_column("option_values", sa.Column("width_cm", sa.Integer(), nullable=True))

    op.execute(
        """
        UPDATE option_values AS value_row
        SET length_cm = value_row.code::integer, updated_at = now()
        FROM options AS option_row
        WHERE option_row.id = value_row.option_id
          AND option_row.code = 'size'
          AND value_row.code IN ('140', '150')
        """
    )


def downgrade() -> None:
    op.drop_column("option_values", "width_cm")
    op.drop_column("option_values", "length_cm")
