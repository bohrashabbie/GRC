"""add contact_messages

Submissions from the storefront's Contact Us form. The page itself is a seeded
CMS page (code `contact_us`, template `contact`); this table is the inbox
behind it. Rows are written by the public /shop/v1/contact endpoint and read
by staff in the admin, who can only move a message between statuses — never
delete it, per the project's no-hard-delete rule.

Revision ID: b8e4d2f7a951
Revises: d1a6e0b48f2c
Create Date: 2026-08-02 03:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b8e4d2f7a951"
down_revision: Union[str, None] = "d1a6e0b48f2c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contact_messages",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        # Locale the shopper submitted from, so a reply can be written in the
        # language they used.
        sa.Column("locale", sa.Text(), nullable=False, server_default="ar"),
        # new -> read -> closed. Statuses instead of a delete.
        sa.Column("status", sa.Text(), nullable=False, server_default="new"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contact_messages_status", "contact_messages", ["status"])
    op.create_index("ix_contact_messages_created_at", "contact_messages", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_contact_messages_created_at", table_name="contact_messages")
    op.drop_index("ix_contact_messages_status", table_name="contact_messages")
    op.drop_table("contact_messages")
