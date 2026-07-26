"""CMS & Marketing tables: banners, menus, pages.

Column set follows the `Storefront Schema` sheet. Translation tables keep a
surrogate `id` with a unique `(parent_id, locale)` instead of the workbook's
composite primary key, matching how `category_translations` and
`product_translations` are already modelled here.
"""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Index,
    Integer,
    TIMESTAMP,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Banner(Base, TimestampMixin):
    __tablename__ = "banners"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    placement: Mapped[str] = mapped_column(nullable=False)
    media_desktop_id: Mapped[int | None] = mapped_column(ForeignKey("media.id"), nullable=True)
    media_mobile_id: Mapped[int | None] = mapped_column(ForeignKey("media.id"), nullable=True)
    link_type: Mapped[str | None] = mapped_column(nullable=True)
    link_target_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    link_url: Mapped[str | None] = mapped_column(nullable=True)
    starts_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Not in the workbook, but the storefront's Banner contract requires it:
    # overlay text colour, picked by the merchandiser against the artwork.
    text_theme: Mapped[str] = mapped_column(nullable=False, default="dark")

    translations: Mapped[list["BannerTranslation"]] = relationship(
        back_populates="banner", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_banners_placement", "placement"),
        Index("ix_banners_is_active", "is_active"),
        Index("ix_banners_ends_at", "ends_at"),
    )


class BannerTranslation(Base, TimestampMixin):
    __tablename__ = "banner_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    banner_id: Mapped[int] = mapped_column(
        ForeignKey("banners.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(nullable=False)
    headline: Mapped[str | None] = mapped_column(nullable=True)
    subheadline: Mapped[str | None] = mapped_column(nullable=True)
    cta_label: Mapped[str | None] = mapped_column(nullable=True)
    alt_text: Mapped[str | None] = mapped_column(nullable=True)

    banner: Mapped["Banner"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("banner_id", "locale", name="uq_banner_translations_banner_locale"),
    )


class Menu(Base, TimestampMixin):
    __tablename__ = "menus"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    items: Mapped[list["MenuItem"]] = relationship(
        back_populates="menu", cascade="all, delete-orphan"
    )


class MenuItem(Base, TimestampMixin):
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    menu_id: Mapped[int] = mapped_column(
        ForeignKey("menus.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("menu_items.id"), nullable=True)
    link_type: Mapped[str] = mapped_column(nullable=False)
    link_target_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    link_url: Mapped[str | None] = mapped_column(nullable=True)
    icon_media_id: Mapped[int | None] = mapped_column(ForeignKey("media.id"), nullable=True)
    badge_code: Mapped[str | None] = mapped_column(nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    menu: Mapped["Menu"] = relationship(back_populates="items")
    children: Mapped[list["MenuItem"]] = relationship(back_populates="parent")
    parent: Mapped["MenuItem"] = relationship(back_populates="children", remote_side=[id])
    translations: Mapped[list["MenuItemTranslation"]] = relationship(
        back_populates="menu_item", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_menu_items_menu_id", "menu_id"),)


class MenuItemTranslation(Base, TimestampMixin):
    __tablename__ = "menu_item_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    menu_item_id: Mapped[int] = mapped_column(
        ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(nullable=False)
    label: Mapped[str] = mapped_column(nullable=False)

    menu_item: Mapped["MenuItem"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("menu_item_id", "locale", name="uq_menu_item_translations_item_locale"),
    )


class Page(Base, TimestampMixin):
    __tablename__ = "pages"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    template: Mapped[str] = mapped_column(nullable=False, default="default")
    status: Mapped[str] = mapped_column(nullable=False, default="draft")
    published_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    translations: Mapped[list["PageTranslation"]] = relationship(
        back_populates="page", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_pages_status", "status"),)


class PageTranslation(Base, TimestampMixin):
    __tablename__ = "page_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    page_id: Mapped[int] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(nullable=False)
    slug: Mapped[str] = mapped_column(nullable=False)
    body: Mapped[str | None] = mapped_column(nullable=True)
    meta_title: Mapped[str | None] = mapped_column(nullable=True)
    meta_description: Mapped[str | None] = mapped_column(nullable=True)

    page: Mapped["Page"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("page_id", "locale", name="uq_page_translations_page_locale"),
        UniqueConstraint("locale", "slug", name="uq_page_translations_locale_slug"),
    )
