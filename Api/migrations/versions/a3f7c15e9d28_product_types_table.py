"""make product types staff-managed instead of a list in the code

Revision ID: a3f7c15e9d28
Revises: c8e52a13d7b4
Create Date: 2026-08-22 09:00:00.000000

products.product_type was validated against a tuple in the source, so adding
"innerwear" or dropping "accessory" meant a deploy. It is a vocabulary the shop
owns, not a rule of the system, so it becomes a table the admin edits.

products.product_type stays the code string it already is rather than becoming
a foreign key: order history and the product list both read it as text, and a
type staff retire must not rewrite the products that carried it. The four codes
the tuple held are seeded with their Arabic and English labels, so nothing that
exists today changes meaning.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a3f7c15e9d28"
down_revision: Union[str, None] = "c8e52a13d7b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# code, English label, Arabic label — the tuple this table replaces.
SEED = (
    ("thobe", "Thobe", "ثوب"),
    ("shemagh", "Shemagh", "شماغ"),
    ("innerwear", "Innerwear", "ملابس داخلية"),
    ("accessory", "Accessory", "إكسسوار"),
)


def upgrade() -> None:
    op.create_table(
        "product_types",
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
    op.create_index("ix_product_types_is_active", "product_types", ["is_active"])

    op.create_table(
        "product_type_translations",
        sa.Column(
            "product_type_id",
            sa.BigInteger(),
            sa.ForeignKey("product_types.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("locale", sa.String(), primary_key=True),
        sa.Column("label", sa.String(), nullable=False),
    )

    for position, (code, english, arabic) in enumerate(SEED):
        op.execute(
            sa.text(
                "INSERT INTO product_types (code, sort_order, is_active) "
                "VALUES (:code, :sort_order, true) ON CONFLICT (code) DO NOTHING"
            ).bindparams(code=code, sort_order=position)
        )
        for locale, label in (("en", english), ("ar", arabic)):
            op.execute(
                sa.text(
                    "INSERT INTO product_type_translations (product_type_id, locale, label) "
                    "SELECT id, :locale, :label FROM product_types WHERE code = :code "
                    "ON CONFLICT (product_type_id, locale) DO NOTHING"
                ).bindparams(code=code, locale=locale, label=label)
            )

    # Anything already on a product but not in the seed keeps working: it is
    # added as a type rather than left as a value the admin cannot show.
    op.execute(
        """
        INSERT INTO product_types (code, sort_order, is_active)
        SELECT DISTINCT p.product_type, 100, true
        FROM products p
        WHERE p.product_type IS NOT NULL
          AND p.product_type <> ''
        ON CONFLICT (code) DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO product_type_translations (product_type_id, locale, label)
        SELECT t.id, locale_row.locale, initcap(replace(t.code, '_', ' '))
        FROM product_types t
        CROSS JOIN (VALUES ('ar'), ('en')) AS locale_row(locale)
        WHERE NOT EXISTS (
            SELECT 1 FROM product_type_translations existing
            WHERE existing.product_type_id = t.id AND existing.locale = locale_row.locale
        )
        """
    )


def downgrade() -> None:
    op.drop_table("product_type_translations")
    op.drop_index("ix_product_types_is_active", table_name="product_types")
    op.drop_table("product_types")
