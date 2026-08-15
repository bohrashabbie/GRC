"""add a short badge to option values

A merchandising label on the value itself — "New", "Limited" — shown next to the
swatch. It sits on the option value rather than the product because it describes
the colourway, not the garment, so it travels with the swatch wherever the
swatch is rendered.

Nullable with no backfill: no existing value has a badge, and an empty string
would render as a blank pill.

Revision ID: c8e52a13d7b4
Revises: b7d41e9c2f58
Create Date: 2026-08-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c8e52a13d7b4"
down_revision: Union[str, None] = "b7d41e9c2f58"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("option_values", sa.Column("tag", sa.String(24), nullable=True))


def downgrade() -> None:
    op.drop_column("option_values", "tag")
