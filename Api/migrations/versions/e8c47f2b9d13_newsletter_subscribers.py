"""keep the emails the footer's "Join the list" form collects

Revision ID: e8c47f2b9d13
Revises: d7b16c4e9a35
Create Date: 2026-08-23 11:00:00.000000

The storefront has asked shoppers to join the list since it was built, and the
form posted nowhere — every address typed into it was lost. This is where they
go.

Deliberately not a customer: most people who subscribe have no account, and an
address here says nothing about who they are. The locale they were reading in
comes along, so a future send can be in the right language, and unsubscribing
is a timestamp rather than a delete — an address that comes back has to be
able to say it left.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import CITEXT


revision: str = "e8c47f2b9d13"
down_revision: Union[str, None] = "d7b16c4e9a35"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "newsletter_subscribers",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        # CITEXT so Ahmed@x.com and ahmed@x.com are one subscriber, not two.
        sa.Column("email", CITEXT(), nullable=False, unique=True),
        sa.Column("locale", sa.String(), nullable=False, server_default="ar"),
        # Where it came from, for when there is more than one place to sign up.
        sa.Column("source", sa.String(), nullable=False, server_default="footer"),
        sa.Column(
            "unsubscribed_at", sa.TIMESTAMP(timezone=True), nullable=True
        ),
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
    op.create_index(
        "ix_newsletter_subscribers_unsubscribed_at",
        "newsletter_subscribers",
        ["unsubscribed_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_newsletter_subscribers_unsubscribed_at",
        table_name="newsletter_subscribers",
    )
    op.drop_table("newsletter_subscribers")
