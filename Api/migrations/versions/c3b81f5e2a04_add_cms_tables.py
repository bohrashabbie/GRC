"""add cms tables: banners, menus, pages

Opens the CMS phase. Column sets follow the `Storefront Schema` sheet's
"CMS & Marketing" section, with one deliberate departure: the workbook gives
the translation tables a composite (parent_id, locale) primary key, while this
build uses a surrogate id plus a unique constraint on that pair, matching
category_translations and product_translations.

Revision ID: c3b81f5e2a04
Revises: a1c7e9d24b30
Create Date: 2026-07-26 23:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c3b81f5e2a04"
down_revision: Union[str, None] = "a1c7e9d24b30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps() -> tuple[sa.Column, sa.Column]:
    return (
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
    )


def upgrade() -> None:
    op.create_table(
        "banners",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("placement", sa.Text(), nullable=False),
        sa.Column("media_desktop_id", sa.BigInteger(), nullable=True),
        sa.Column("media_mobile_id", sa.BigInteger(), nullable=True),
        sa.Column("link_type", sa.Text(), nullable=True),
        sa.Column("link_target_id", sa.BigInteger(), nullable=True),
        sa.Column("link_url", sa.Text(), nullable=True),
        sa.Column("starts_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("ends_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("text_theme", sa.Text(), nullable=False, server_default="dark"),
        *_timestamps(),
        sa.ForeignKeyConstraint(["media_desktop_id"], ["media.id"]),
        sa.ForeignKeyConstraint(["media_mobile_id"], ["media.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_banners_placement", "banners", ["placement"])
    op.create_index("ix_banners_is_active", "banners", ["is_active"])
    op.create_index("ix_banners_ends_at", "banners", ["ends_at"])

    op.create_table(
        "banner_translations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("banner_id", sa.BigInteger(), nullable=False),
        sa.Column("locale", sa.Text(), nullable=False),
        sa.Column("headline", sa.Text(), nullable=True),
        sa.Column("subheadline", sa.Text(), nullable=True),
        sa.Column("cta_label", sa.Text(), nullable=True),
        sa.Column("alt_text", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["banner_id"], ["banners.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "banner_id", "locale", name="uq_banner_translations_banner_locale"
        ),
    )

    op.create_table(
        "menus",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "menu_items",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("menu_id", sa.BigInteger(), nullable=False),
        sa.Column("parent_id", sa.BigInteger(), nullable=True),
        sa.Column("link_type", sa.Text(), nullable=False),
        sa.Column("link_target_id", sa.BigInteger(), nullable=True),
        sa.Column("link_url", sa.Text(), nullable=True),
        sa.Column("icon_media_id", sa.BigInteger(), nullable=True),
        sa.Column("badge_code", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.ForeignKeyConstraint(["menu_id"], ["menus.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["menu_items.id"]),
        sa.ForeignKeyConstraint(["icon_media_id"], ["media.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_menu_items_menu_id", "menu_items", ["menu_id"])

    op.create_table(
        "menu_item_translations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("menu_item_id", sa.BigInteger(), nullable=False),
        sa.Column("locale", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["menu_item_id"], ["menu_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "menu_item_id", "locale", name="uq_menu_item_translations_item_locale"
        ),
    )

    op.create_table(
        "pages",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("template", sa.Text(), nullable=False, server_default="default"),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("published_at", sa.TIMESTAMP(timezone=True), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_pages_status", "pages", ["status"])

    op.create_table(
        "page_translations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("page_id", sa.BigInteger(), nullable=False),
        sa.Column("locale", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("meta_title", sa.Text(), nullable=True),
        sa.Column("meta_description", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("page_id", "locale", name="uq_page_translations_page_locale"),
        sa.UniqueConstraint("locale", "slug", name="uq_page_translations_locale_slug"),
    )


def downgrade() -> None:
    op.drop_table("page_translations")
    op.drop_index("ix_pages_status", table_name="pages")
    op.drop_table("pages")
    op.drop_table("menu_item_translations")
    op.drop_index("ix_menu_items_menu_id", table_name="menu_items")
    op.drop_table("menu_items")
    op.drop_table("menus")
    op.drop_table("banner_translations")
    op.drop_index("ix_banners_ends_at", table_name="banners")
    op.drop_index("ix_banners_is_active", table_name="banners")
    op.drop_index("ix_banners_placement", table_name="banners")
    op.drop_table("banners")
