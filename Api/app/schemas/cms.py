"""Request/response models for banners, menus and static pages."""

from datetime import datetime

from pydantic import BaseModel, Field

BANNER_PLACEMENTS = {"home_hero", "home_promo", "category_top", "checkout_strip"}
BANNER_LINK_TYPES = {"category", "product", "collection", "url"}
MENU_LINK_TYPES = {"category", "brand", "collection", "page", "url"}
PAGE_TEMPLATES = {"default", "full_width", "contact"}
PAGE_STATUSES = {"draft", "published"}


# --------------------------------------------------------------------------- #
# Banners                                                                      #
# --------------------------------------------------------------------------- #


class BannerTranslationIn(BaseModel):
    locale: str
    headline: str | None = None
    subheadline: str | None = None
    cta_label: str | None = None
    alt_text: str | None = None


class BannerTranslationOut(BannerTranslationIn):
    model_config = {"from_attributes": True}


class BannerCreate(BaseModel):
    placement: str
    media_desktop_id: int | None = None
    media_mobile_id: int | None = None
    link_type: str | None = None
    link_target_id: int | None = None
    link_url: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    sort_order: int = 0
    is_active: bool = True
    text_theme: str = "dark"
    translations: list[BannerTranslationIn] = Field(min_length=1)


class BannerUpdate(BaseModel):
    placement: str | None = None
    media_desktop_id: int | None = None
    media_mobile_id: int | None = None
    link_type: str | None = None
    link_target_id: int | None = None
    link_url: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    text_theme: str | None = None
    translations: list[BannerTranslationIn] | None = None


class BannerRead(BaseModel):
    id: int
    placement: str
    media_desktop_id: int | None
    media_mobile_id: int | None
    link_type: str | None
    link_target_id: int | None
    link_url: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    sort_order: int
    is_active: bool
    text_theme: str
    translations: list[BannerTranslationOut]

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
# Menus                                                                        #
# --------------------------------------------------------------------------- #


class MenuItemTranslationIn(BaseModel):
    locale: str
    label: str


class MenuItemTranslationOut(MenuItemTranslationIn):
    model_config = {"from_attributes": True}


class MenuItemCreate(BaseModel):
    parent_id: int | None = None
    link_type: str
    link_target_id: int | None = None
    link_url: str | None = None
    icon_media_id: int | None = None
    badge_code: str | None = None
    sort_order: int = 0
    is_active: bool = True
    translations: list[MenuItemTranslationIn] = Field(min_length=1)


class MenuItemUpdate(BaseModel):
    parent_id: int | None = None
    link_type: str | None = None
    link_target_id: int | None = None
    link_url: str | None = None
    icon_media_id: int | None = None
    badge_code: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    translations: list[MenuItemTranslationIn] | None = None


class MenuItemRead(BaseModel):
    id: int
    menu_id: int
    parent_id: int | None
    link_type: str
    link_target_id: int | None
    link_url: str | None
    icon_media_id: int | None
    badge_code: str | None
    sort_order: int
    is_active: bool
    translations: list[MenuItemTranslationOut]

    model_config = {"from_attributes": True}


class MenuCreate(BaseModel):
    code: str
    is_active: bool = True


class MenuUpdate(BaseModel):
    code: str | None = None
    is_active: bool | None = None


class MenuRead(BaseModel):
    id: int
    code: str
    is_active: bool
    items: list[MenuItemRead]

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
# Pages                                                                        #
# --------------------------------------------------------------------------- #


class PageTranslationIn(BaseModel):
    locale: str
    title: str
    slug: str | None = None
    body: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None


class PageTranslationOut(BaseModel):
    locale: str
    title: str
    slug: str
    body: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None

    model_config = {"from_attributes": True}


class PageCreate(BaseModel):
    code: str
    template: str = "default"
    status: str = "draft"
    translations: list[PageTranslationIn] = Field(min_length=1)


class PageUpdate(BaseModel):
    code: str | None = None
    template: str | None = None
    status: str | None = None
    translations: list[PageTranslationIn] | None = None


class PageRead(BaseModel):
    id: int
    code: str
    template: str
    status: str
    published_at: datetime | None
    translations: list[PageTranslationOut]

    model_config = {"from_attributes": True}
