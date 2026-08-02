"""Request/response models for banners, menus, static pages and the
contact-form inbox."""

from datetime import datetime

from pydantic import BaseModel, Field

BANNER_PLACEMENTS = {"home_hero"}
BANNER_LINK_TYPES = {"category", "product", "collection", "url"}
PAGE_STATUSES = {"draft", "published"}
CONTACT_MESSAGE_STATUSES = {"new", "read", "closed"}


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
    # Resolved keys so the edit form can show the artwork it already has. With
    # only the ids, a configured banner rendered as "No image set".
    media_desktop_key: str | None = None
    media_mobile_key: str | None = None
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


class MenuItemUpdate(BaseModel):
    """Menu items are seeded, not staff-created — only the label text (and
    is_active, to hide a link without deleting it) can change here."""

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


class MenuUpdate(BaseModel):
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


class PageUpdate(BaseModel):
    """Pages are seeded, not staff-created — code and template are fixed at
    seed time; staff can only change the translation text and publish status."""

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


# --------------------------------------------------------------------------- #
# Contact messages                                                             #
# --------------------------------------------------------------------------- #


class ContactMessageUpdate(BaseModel):
    """Staff can only move a message between statuses — the sender's words are
    never editable."""

    status: str


class ContactMessageRead(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None
    subject: str | None
    message: str
    locale: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
