"""Banners, menus and static pages.

Deletes are soft, per the project rule that DELETE endpoints never call
session.delete(): banners and menu items flip is_active, a page drops back to
draft. Nothing here is referenced by an order, but keeping one deletion
semantic across the codebase is worth more than the exception.
"""

from datetime import datetime, timezone

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.cms import (
    Banner,
    BannerTranslation,
    Menu,
    MenuItem,
    MenuItemTranslation,
    Page,
    PageTranslation,
)
from app.schemas.cms import (
    BANNER_LINK_TYPES,
    BANNER_PLACEMENTS,
    MENU_LINK_TYPES,
    PAGE_STATUSES,
    PAGE_TEMPLATES,
)
from app.utils import paginate, slugify


# --------------------------------------------------------------------------- #
# Shared validation                                                            #
# --------------------------------------------------------------------------- #


def _check_choice(value: str | None, allowed: set[str], field: str) -> None:
    if value is not None and value not in allowed:
        raise BusinessRuleError(
            f"Unsupported {field} '{value}'. Expected one of: {', '.join(sorted(allowed))}"
        )


def _check_link(link_type: str | None, link_target_id: int | None, link_url: str | None) -> None:
    """A link is either a typed reference or a raw URL, never both, never neither."""
    if link_type is None:
        return
    if link_type == "url":
        if not link_url:
            raise BusinessRuleError("link_url is required when link_type is 'url'")
    elif link_target_id is None:
        raise BusinessRuleError(f"link_target_id is required when link_type is '{link_type}'")


# --------------------------------------------------------------------------- #
# Banners                                                                      #
# --------------------------------------------------------------------------- #


def _sync_banner_translations(db: Session, banner: Banner, translations_in: list) -> None:
    existing = {t.locale: t for t in banner.translations}
    seen = set()
    for t_in in translations_in:
        seen.add(t_in.locale)
        row = existing.get(t_in.locale)
        if row is None:
            db.add(
                BannerTranslation(
                    banner_id=banner.id,
                    locale=t_in.locale,
                    headline=t_in.headline,
                    subheadline=t_in.subheadline,
                    cta_label=t_in.cta_label,
                    alt_text=t_in.alt_text,
                )
            )
        else:
            row.headline = t_in.headline
            row.subheadline = t_in.subheadline
            row.cta_label = t_in.cta_label
            row.alt_text = t_in.alt_text
    for locale, row in existing.items():
        if locale not in seen:
            db.delete(row)


def list_banners(
    db: Session,
    cursor: str | None,
    limit: int,
    placement: str | None = None,
    is_active: bool | None = None,
) -> tuple[list[Banner], str | None]:
    stmt: Select = select(Banner).options(selectinload(Banner.translations))
    if placement:
        stmt = stmt.where(Banner.placement == placement)
    if is_active is not None:
        stmt = stmt.where(Banner.is_active.is_(is_active))
    return paginate(db, stmt, Banner, cursor, limit)


def get_banner(db: Session, banner_id: int) -> Banner:
    banner = db.get(Banner, banner_id, options=[selectinload(Banner.translations)])
    if banner is None:
        raise NotFoundError("Banner not found")
    return banner


def create_banner(db: Session, data) -> Banner:
    _check_choice(data.placement, BANNER_PLACEMENTS, "placement")
    _check_choice(data.link_type, BANNER_LINK_TYPES, "link_type")
    _check_link(data.link_type, data.link_target_id, data.link_url)
    if data.starts_at and data.ends_at and data.ends_at <= data.starts_at:
        raise BusinessRuleError("ends_at must be after starts_at")

    banner = Banner(
        placement=data.placement,
        media_desktop_id=data.media_desktop_id,
        media_mobile_id=data.media_mobile_id,
        link_type=data.link_type,
        link_target_id=data.link_target_id,
        link_url=data.link_url,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        sort_order=data.sort_order,
        is_active=data.is_active,
        text_theme=data.text_theme,
    )
    db.add(banner)
    db.flush()
    _sync_banner_translations(db, banner, data.translations)
    db.commit()
    db.refresh(banner)
    return banner


def update_banner(db: Session, banner_id: int, data) -> Banner:
    banner = get_banner(db, banner_id)
    _check_choice(data.placement, BANNER_PLACEMENTS, "placement")
    _check_choice(data.link_type, BANNER_LINK_TYPES, "link_type")

    fields = data.model_dump(exclude_unset=True, exclude={"translations"})
    for field, value in fields.items():
        setattr(banner, field, value)

    _check_link(banner.link_type, banner.link_target_id, banner.link_url)
    if banner.starts_at and banner.ends_at and banner.ends_at <= banner.starts_at:
        raise BusinessRuleError("ends_at must be after starts_at")

    if data.translations is not None:
        _sync_banner_translations(db, banner, data.translations)

    db.commit()
    db.refresh(banner)
    return banner


def deactivate_banner(db: Session, banner_id: int) -> None:
    banner = get_banner(db, banner_id)
    banner.is_active = False
    db.commit()


def active_banners(db: Session, placement: str) -> list[Banner]:
    """Storefront view: active, in-schedule, ordered by sort_order."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(Banner)
        .options(selectinload(Banner.translations))
        .where(Banner.placement == placement, Banner.is_active.is_(True))
        .order_by(Banner.sort_order, Banner.id)
    )
    rows = list(db.execute(stmt).scalars().all())
    return [
        row
        for row in rows
        if (row.starts_at is None or row.starts_at <= now)
        and (row.ends_at is None or row.ends_at > now)
    ]


# --------------------------------------------------------------------------- #
# Menus                                                                        #
# --------------------------------------------------------------------------- #


def _menu_options() -> list:
    return [selectinload(Menu.items).selectinload(MenuItem.translations)]


def list_menus(db: Session, cursor: str | None, limit: int) -> tuple[list[Menu], str | None]:
    stmt: Select = select(Menu).options(*_menu_options())
    return paginate(db, stmt, Menu, cursor, limit)


def get_menu(db: Session, menu_id: int) -> Menu:
    menu = db.get(Menu, menu_id, options=_menu_options())
    if menu is None:
        raise NotFoundError("Menu not found")
    return menu


def get_menu_by_code(db: Session, code: str) -> Menu:
    stmt = select(Menu).options(*_menu_options()).where(Menu.code == code)
    menu = db.execute(stmt).scalars().first()
    if menu is None:
        raise NotFoundError("Menu not found")
    return menu


def create_menu(db: Session, data) -> Menu:
    menu = Menu(code=data.code, is_active=data.is_active)
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu


def update_menu(db: Session, menu_id: int, data) -> Menu:
    menu = get_menu(db, menu_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(menu, field, value)
    db.commit()
    db.refresh(menu)
    return menu


def deactivate_menu(db: Session, menu_id: int) -> None:
    menu = get_menu(db, menu_id)
    menu.is_active = False
    db.commit()


def _sync_menu_item_translations(db: Session, item: MenuItem, translations_in: list) -> None:
    existing = {t.locale: t for t in item.translations}
    seen = set()
    for t_in in translations_in:
        seen.add(t_in.locale)
        row = existing.get(t_in.locale)
        if row is None:
            db.add(
                MenuItemTranslation(
                    menu_item_id=item.id, locale=t_in.locale, label=t_in.label
                )
            )
        else:
            row.label = t_in.label
    for locale, row in existing.items():
        if locale not in seen:
            db.delete(row)


def get_menu_item(db: Session, item_id: int) -> MenuItem:
    item = db.get(MenuItem, item_id, options=[selectinload(MenuItem.translations)])
    if item is None:
        raise NotFoundError("Menu item not found")
    return item


def create_menu_item(db: Session, menu_id: int, data) -> MenuItem:
    menu = get_menu(db, menu_id)
    _check_choice(data.link_type, MENU_LINK_TYPES, "link_type")
    _check_link(data.link_type, data.link_target_id, data.link_url)
    if data.parent_id is not None:
        parent = get_menu_item(db, data.parent_id)
        if parent.menu_id != menu.id:
            raise BusinessRuleError("parent_id belongs to a different menu")

    item = MenuItem(
        menu_id=menu.id,
        parent_id=data.parent_id,
        link_type=data.link_type,
        link_target_id=data.link_target_id,
        link_url=data.link_url,
        icon_media_id=data.icon_media_id,
        badge_code=data.badge_code,
        sort_order=data.sort_order,
        is_active=data.is_active,
    )
    db.add(item)
    db.flush()
    _sync_menu_item_translations(db, item, data.translations)
    db.commit()
    db.refresh(item)
    return item


def update_menu_item(db: Session, item_id: int, data) -> MenuItem:
    item = get_menu_item(db, item_id)
    _check_choice(data.link_type, MENU_LINK_TYPES, "link_type")
    if data.parent_id is not None and data.parent_id == item.id:
        raise BusinessRuleError("A menu item cannot be its own parent")

    for field, value in data.model_dump(exclude_unset=True, exclude={"translations"}).items():
        setattr(item, field, value)

    _check_link(item.link_type, item.link_target_id, item.link_url)
    if data.translations is not None:
        _sync_menu_item_translations(db, item, data.translations)

    db.commit()
    db.refresh(item)
    return item


def deactivate_menu_item(db: Session, item_id: int) -> None:
    item = get_menu_item(db, item_id)
    item.is_active = False
    db.commit()


# --------------------------------------------------------------------------- #
# Pages                                                                        #
# --------------------------------------------------------------------------- #


def _sync_page_translations(db: Session, page: Page, translations_in: list) -> None:
    existing = {t.locale: t for t in page.translations}
    seen = set()
    for t_in in translations_in:
        seen.add(t_in.locale)
        slug = t_in.slug or slugify(t_in.title, t_in.locale)
        row = existing.get(t_in.locale)
        if row is None:
            db.add(
                PageTranslation(
                    page_id=page.id,
                    locale=t_in.locale,
                    title=t_in.title,
                    slug=slug,
                    body=t_in.body,
                    meta_title=t_in.meta_title,
                    meta_description=t_in.meta_description,
                )
            )
        else:
            row.title = t_in.title
            row.slug = slug
            row.body = t_in.body
            row.meta_title = t_in.meta_title
            row.meta_description = t_in.meta_description
    for locale, row in existing.items():
        if locale not in seen:
            db.delete(row)


def list_pages(
    db: Session, cursor: str | None, limit: int, status: str | None = None
) -> tuple[list[Page], str | None]:
    stmt: Select = select(Page).options(selectinload(Page.translations))
    if status:
        stmt = stmt.where(Page.status == status)
    return paginate(db, stmt, Page, cursor, limit)


def get_page(db: Session, page_id: int) -> Page:
    page = db.get(Page, page_id, options=[selectinload(Page.translations)])
    if page is None:
        raise NotFoundError("Page not found")
    return page


def get_published_page_by_slug(db: Session, slug: str, locale: str) -> Page:
    stmt = (
        select(Page)
        .join(PageTranslation, PageTranslation.page_id == Page.id)
        .options(selectinload(Page.translations))
        .where(
            PageTranslation.slug == slug,
            PageTranslation.locale == locale,
            Page.status == "published",
        )
    )
    page = db.execute(stmt).scalars().first()
    if page is None:
        raise NotFoundError("Page not found")
    return page


def published_page_slugs(db: Session, locale: str) -> list[str]:
    stmt = (
        select(PageTranslation.slug)
        .join(Page, Page.id == PageTranslation.page_id)
        .where(PageTranslation.locale == locale, Page.status == "published")
    )
    return list(db.execute(stmt).scalars().all())


def create_page(db: Session, data) -> Page:
    _check_choice(data.template, PAGE_TEMPLATES, "template")
    _check_choice(data.status, PAGE_STATUSES, "status")

    page = Page(
        code=data.code,
        template=data.template,
        status=data.status,
        published_at=datetime.now(timezone.utc) if data.status == "published" else None,
    )
    db.add(page)
    db.flush()
    _sync_page_translations(db, page, data.translations)
    db.commit()
    db.refresh(page)
    return page


def update_page(db: Session, page_id: int, data) -> Page:
    page = get_page(db, page_id)
    _check_choice(data.template, PAGE_TEMPLATES, "template")
    _check_choice(data.status, PAGE_STATUSES, "status")

    was_published = page.status == "published"
    for field, value in data.model_dump(exclude_unset=True, exclude={"translations"}).items():
        setattr(page, field, value)

    # published_at records the first publication, and is cleared when a page
    # goes back to draft so the storefront never shows a stale date.
    if page.status == "published" and not was_published:
        page.published_at = datetime.now(timezone.utc)
    elif page.status == "draft":
        page.published_at = None

    if data.translations is not None:
        _sync_page_translations(db, page, data.translations)

    db.commit()
    db.refresh(page)
    return page


def unpublish_page(db: Session, page_id: int) -> None:
    page = get_page(db, page_id)
    page.status = "draft"
    page.published_at = None
    db.commit()
