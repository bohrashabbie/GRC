"""add coupons and coupon redemptions

orders already carried discount_total and coupon_code_snapshot, so nothing on
the order side changes — the snapshot stays the customer-facing record and
never joins back here (Hard Rule 7). What was missing is the codes themselves:
the storefront's coupon box was fixture-only and validated against nothing.

coupons.code is CITEXT because shoppers type it by hand and will not reproduce
the casing staff chose.

coupon_redemptions is the append-only ledger behind coupons.times_redeemed,
with a unique (coupon_id, order_id) so a retried checkout cannot count one
order's discount twice.

Revision ID: b7d41e9c2f58
Revises: a2f8c4d6b913
Create Date: 2026-08-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import CITEXT

revision: str = "b7d41e9c2f58"
down_revision: Union[str, None] = "a2f8c4d6b913"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coupons",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("code", CITEXT(), nullable=False),
        sa.Column("discount_type", sa.String(), nullable=False, server_default="percent"),
        sa.Column("value", sa.Numeric(12, 3), nullable=False),
        sa.Column("min_subtotal", sa.Numeric(12, 3), nullable=True),
        sa.Column("starts_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("ends_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("max_redemptions", sa.Integer(), nullable=True),
        sa.Column("times_redeemed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("code", name="uq_coupons_code"),
        sa.CheckConstraint("discount_type IN ('percent', 'fixed')", name="ck_coupons_discount_type"),
        sa.CheckConstraint("value > 0", name="ck_coupons_value_positive"),
        # A percentage over 100 would invert the total into a refund.
        sa.CheckConstraint(
            "discount_type <> 'percent' OR value <= 100", name="ck_coupons_percent_max"
        ),
    )
    op.create_index("ix_coupons_is_active", "coupons", ["is_active"])

    op.create_table(
        "coupon_redemptions",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("coupon_id", sa.BigInteger(), sa.ForeignKey("coupons.id"), nullable=False),
        sa.Column("order_id", sa.BigInteger(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("customer_id", sa.BigInteger(), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("amount", sa.Numeric(12, 3), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("coupon_id", "order_id", name="uq_coupon_redemptions_coupon_order"),
    )
    op.create_index("ix_coupon_redemptions_coupon_id", "coupon_redemptions", ["coupon_id"])


def downgrade() -> None:
    op.drop_index("ix_coupon_redemptions_coupon_id", table_name="coupon_redemptions")
    op.drop_table("coupon_redemptions")
    op.drop_index("ix_coupons_is_active", table_name="coupons")
    op.drop_table("coupons")
