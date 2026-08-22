"""make category types staff-managed instead of a list in the code

Revision ID: c9a2f48b1e57
Revises: b5d93e7a41c6
Create Date: 2026-08-22 13:00:00.000000

categories.dimension separates the department tree from collections and
occasions — three trees in one table, each with its own root set. The three
names were a tuple in the source, so the shop could not add a fourth (a
"season" tree, say) without a deploy.

Same shape as product_types: categories.dimension stays the code as text
rather than becoming a foreign key, so retiring a type never rewrites the
categories filed under it. The three codes are seeded with their labels, and
anything already sitting on a category is picked up so nothing loses meaning.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c9a2f48b1e57"
down_revision: Union[str, None] = "b5d93e7a41c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# code, English label, Arabic label
SEED = (
    ("category", "Category", "تصنيف"),
    ("collection", "Collection", "مجموعة"),
    ("occasion", "Occasion", "مناسبة"),
)


def upgrade() -> None:
    op.create_table(
        "category_types",
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
    op.create_index("ix_category_types_is_active", "category_types", ["is_active"])

    op.create_table(
        "category_type_translations",
        sa.Column(
            "category_type_id",
            sa.BigInteger(),
            sa.ForeignKey("category_types.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("locale", sa.String(), primary_key=True),
        sa.Column("label", sa.String(), nullable=False),
    )

    for position, (code, english, arabic) in enumerate(SEED):
        op.execute(
            sa.text(
                "INSERT INTO category_types (code, sort_order, is_active) "
                "VALUES (:code, :sort_order, true) ON CONFLICT (code) DO NOTHING"
            ).bindparams(code=code, sort_order=position)
        )
        for locale, label in (("en", english), ("ar", arabic)):
            op.execute(
                sa.text(
                    "INSERT INTO category_type_translations (category_type_id, locale, label) "
                    "SELECT id, :locale, :label FROM category_types WHERE code = :code "
                    "ON CONFLICT (category_type_id, locale) DO NOTHING"
                ).bindparams(code=code, locale=locale, label=label)
            )

    op.execute(
        """
        INSERT INTO category_types (code, sort_order, is_active)
        SELECT DISTINCT c.dimension, 100, true
        FROM categories c
        WHERE c.dimension IS NOT NULL AND c.dimension <> ''
        ON CONFLICT (code) DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO category_type_translations (category_type_id, locale, label)
        SELECT t.id, locale_row.locale, initcap(replace(t.code, '_', ' '))
        FROM category_types t
        CROSS JOIN (VALUES ('ar'), ('en')) AS locale_row(locale)
        WHERE NOT EXISTS (
            SELECT 1 FROM category_type_translations existing
            WHERE existing.category_type_id = t.id AND existing.locale = locale_row.locale
        )
        """
    )


def downgrade() -> None:
    op.drop_table("category_type_translations")
    op.drop_index("ix_category_types_is_active", table_name="category_types")
    op.drop_table("category_types")
