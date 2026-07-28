"""seed kuwait governorates into regions

The storefront's governorate dropdown is served from app/kuwait.py, but
customer_addresses.region_id is a NOT NULL foreign key to this table — so a
saved address needs a real row to point at. The codes match the slugs the
regions endpoint hands out, which is what lets a submitted slug be resolved
back to a row without a second mapping to keep in sync.

The pre-existing Saudi row is deactivated rather than deleted: an address may
already reference it, and Hard Rule 4 says nothing referenced gets hard-deleted.

Revision ID: f2a94d1c7e38
Revises: e7c31b8fa204
Create Date: 2026-07-28 17:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f2a94d1c7e38"
down_revision: Union[str, None] = "e7c31b8fa204"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

GOVERNORATES = [
    ("capital", "Capital", "العاصمة"),
    ("hawalli", "Hawalli", "حولي"),
    ("farwaniya", "Farwaniya", "الفروانية"),
    ("mubarak-al-kabeer", "Mubarak Al Kabeer", "مبارك الكبير"),
    ("ahmadi", "Ahmadi", "الأحمدي"),
    ("jahra", "Jahra", "الجهراء"),
]


def upgrade() -> None:
    connection = op.get_bind()

    for code, name_en, name_ar in GOVERNORATES:
        connection.execute(
            sa.text(
                """
                INSERT INTO regions (country_code, code, name_ar, name_en, is_active,
                                     created_at, updated_at)
                VALUES ('KW', :code, :name_ar, :name_en, TRUE, now(), now())
                ON CONFLICT (code) DO UPDATE
                    SET country_code = 'KW',
                        name_ar = EXCLUDED.name_ar,
                        name_en = EXCLUDED.name_en,
                        is_active = TRUE
                """
            ),
            {"code": code, "name_en": name_en, "name_ar": name_ar},
        )

    # Retired, not removed — an existing address may still point at it.
    connection.execute(
        sa.text("UPDATE regions SET is_active = FALSE WHERE country_code <> 'KW'")
    )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text("UPDATE regions SET is_active = TRUE WHERE country_code <> 'KW'")
    )
    connection.execute(
        sa.text("DELETE FROM regions WHERE country_code = 'KW' AND code = ANY(:codes)"),
        {"codes": [code for code, _en, _ar in GOVERNORATES]},
    )
