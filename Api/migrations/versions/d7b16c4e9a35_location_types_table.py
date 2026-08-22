"""make location types staff-managed instead of a list in the code

Revision ID: d7b16c4e9a35
Revises: c9a2f48b1e57
Create Date: 2026-08-23 09:00:00.000000

locations.type says what a place is — a warehouse, a shop floor, a virtual
holding location. The three names were a tuple in the source, so the business
could not add a fourth (a supplier's premises, say) without a deploy.

Same shape as product_types and category_types: locations.type stays the code
as text, so retiring a type never rewrites the places filed under it.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d7b16c4e9a35"
down_revision: Union[str, None] = "c9a2f48b1e57"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# code, English label, Arabic label
SEED = (
    ("warehouse", "Warehouse", "مستودع"),
    ("store", "Store", "متجر"),
    ("virtual", "Virtual", "افتراضي"),
)


def upgrade() -> None:
    op.create_table(
        "location_types",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("code", sa.String(), nullable=False, unique=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_location_types_is_active", "location_types", ["is_active"])

    op.create_table(
        "location_type_translations",
        sa.Column(
            "location_type_id",
            sa.BigInteger(),
            sa.ForeignKey("location_types.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("locale", sa.String(), primary_key=True),
        sa.Column("label", sa.String(), nullable=False),
    )

    for position, (code, english, arabic) in enumerate(SEED):
        op.execute(
            sa.text(
                "INSERT INTO location_types (code, sort_order, is_active) "
                "VALUES (:code, :sort_order, true) ON CONFLICT (code) DO NOTHING"
            ).bindparams(code=code, sort_order=position)
        )
        for locale, label in (("en", english), ("ar", arabic)):
            op.execute(
                sa.text(
                    "INSERT INTO location_type_translations (location_type_id, locale, label) "
                    "SELECT id, :locale, :label FROM location_types WHERE code = :code "
                    "ON CONFLICT (location_type_id, locale) DO NOTHING"
                ).bindparams(code=code, locale=locale, label=label)
            )

    op.execute(
        """
        INSERT INTO location_types (code, sort_order, is_active)
        SELECT DISTINCT l.type, 100, true
        FROM locations l
        WHERE l.type IS NOT NULL AND l.type <> ''
        ON CONFLICT (code) DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO location_type_translations (location_type_id, locale, label)
        SELECT t.id, locale_row.locale, initcap(replace(t.code, '_', ' '))
        FROM location_types t
        CROSS JOIN (VALUES ('ar'), ('en')) AS locale_row(locale)
        WHERE NOT EXISTS (
            SELECT 1 FROM location_type_translations existing
            WHERE existing.location_type_id = t.id AND existing.locale = locale_row.locale
        )
        """
    )


def downgrade() -> None:
    op.drop_table("location_type_translations")
    op.drop_index("ix_location_types_is_active", table_name="location_types")
    op.drop_table("location_types")
