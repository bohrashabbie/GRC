"""seed fixed colour/size options and link legacy customer orders

Revision ID: b6d4c8e9f210
Revises: a3f7b21e9c56
Create Date: 2026-07-28 18:45:00.000000

The option rows are configuration, not merchant-created catalogue data. Colour
remains extensible through its values; size is seeded with the fixed values the
store supports. Existing extra options/values are left untouched because
variants may reference them, but the application no longer exposes them.

Orders created before authenticated checkout carried the customer's email but
not customer_id. Backfill only NULL links where the email matches the unique
customer email, preserving any explicit association already present.
"""

from typing import Sequence, Union

from alembic import op


revision: str = "b6d4c8e9f210"
down_revision: Union[str, None] = "a3f7b21e9c56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Preserve an existing American-spelling colour option and all of its
    # value/variant references when there is no canonical row yet.
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM options WHERE lower(code) = 'color')
             AND NOT EXISTS (SELECT 1 FROM options WHERE lower(code) = 'colour') THEN
            UPDATE options SET code = 'colour', updated_at = now()
            WHERE lower(code) = 'color';
          END IF;
        END $$;
        """
    )

    op.execute(
        """
        INSERT INTO options (code, input_type, is_filterable, sort_order)
        VALUES
          ('colour', 'swatch', true, 0),
          ('size', 'button', true, 1)
        ON CONFLICT (code) DO UPDATE SET
          input_type = EXCLUDED.input_type,
          is_filterable = EXCLUDED.is_filterable,
          sort_order = EXCLUDED.sort_order,
          updated_at = now()
        """
    )

    op.execute(
        """
        INSERT INTO option_translations (option_id, locale, label)
        SELECT option_row.id, labels.locale, labels.label
        FROM options AS option_row
        JOIN (VALUES
          ('colour', 'en', 'Color'),
          ('colour', 'ar', '\u0627\u0644\u0644\u0648\u0646'),
          ('size', 'en', 'Size'),
          ('size', 'ar', '\u0627\u0644\u0645\u0642\u0627\u0633')
        ) AS labels(code, locale, label) ON labels.code = option_row.code
        ON CONFLICT (option_id, locale) DO UPDATE SET label = EXCLUDED.label
        """
    )

    op.execute(
        """
        INSERT INTO option_values (option_id, code, hex_color, swatch_media_id, sort_order)
        SELECT size_option.id, sizes.code, NULL, NULL, sizes.sort_order
        FROM options AS size_option
        CROSS JOIN (VALUES
          ('140', 0),
          ('150', 1),
          ('s', 2),
          ('m', 3),
          ('l', 4)
        ) AS sizes(code, sort_order)
        WHERE size_option.code = 'size'
        ON CONFLICT (option_id, code) DO UPDATE SET
          sort_order = EXCLUDED.sort_order,
          updated_at = now()
        """
    )

    op.execute(
        """
        INSERT INTO option_value_translations (option_value_id, locale, label)
        SELECT option_value.id, labels.locale, labels.label
        FROM option_values AS option_value
        JOIN options AS size_option
          ON size_option.id = option_value.option_id AND size_option.code = 'size'
        JOIN (VALUES
          ('140', 'en', '140 cm'), ('140', 'ar', '140 \u0633\u0645'),
          ('150', 'en', '150 cm'), ('150', 'ar', '150 \u0633\u0645'),
          ('s', 'en', 'S'), ('s', 'ar', 'S'),
          ('m', 'en', 'M'), ('m', 'ar', 'M'),
          ('l', 'en', 'L'), ('l', 'ar', 'L')
        ) AS labels(code, locale, label) ON labels.code = option_value.code
        ON CONFLICT (option_value_id, locale) DO UPDATE SET label = EXCLUDED.label
        """
    )

    op.execute(
        """
        UPDATE orders AS order_row
        SET customer_id = customer_row.id,
            updated_at = now()
        FROM customers AS customer_row
        WHERE order_row.customer_id IS NULL
          AND order_row.email IS NOT NULL
          AND customer_row.email = order_row.email
        """
    )


def downgrade() -> None:
    # Deliberately non-destructive: variants and orders may reference the rows
    # populated above, and the previous NULL customer link cannot be inferred.
    pass
