"""Banners, menus and static pages.

Deletion follows the same rule as the rest of the catalogue: the row goes when
nothing points at it, and is retired when something does. Nothing here is ever
referenced by an order, so the only real dependency is internal — a menu item
linking to a page, or nested under another item.

Banners still soft-delete, because a banner is a scheduled slot staff bring
back seasonally rather than something they mean to destroy.
"""

from datetime import datetime, timezone

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, ConflictError, NotFoundError
from app.services import deletion, media_service
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
    MENU_ITEM_LINK_TYPES,
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


def attach_banner_image_keys(db: Session, banners: list[Banner]) -> None:
    """Resolve both artwork ids to storage keys, one query for the whole page.
    Without this the edit form receives an id it cannot render and shows "No
    image set" over a banner that has artwork."""
    keys = media_service.storage_keys(
        db, [b.media_desktop_id for b in banners] + [b.media_mobile_id for b in banners]
    )
    for banner in banners:
        banner.media_desktop_key = keys.get(banner.media_desktop_id)
        banner.media_mobile_key = keys.get(banner.media_mobile_id)


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
    items, next_cursor = paginate(db, stmt, Banner, cursor, limit)
    attach_banner_image_keys(db, items)
    return items, next_cursor


def get_banner(db: Session, banner_id: int) -> Banner:
    banner = db.get(Banner, banner_id, options=[selectinload(Banner.translations)])
    if banner is None:
        raise NotFoundError("Banner not found")
    attach_banner_image_keys(db, [banner])
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
    attach_banner_image_keys(db, [banner])
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
    attach_banner_image_keys(db, [banner])
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


def update_menu(db: Session, menu_id: int, data) -> Menu:
    menu = get_menu(db, menu_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(menu, field, value)
    db.commit()
    db.refresh(menu)
    return menu


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
    """Add a nav entry to a menu."""
    get_menu(db, menu_id)
    _check_choice(data.link_type, MENU_ITEM_LINK_TYPES, "link_type")
    _check_link(data.link_type, data.link_target_id, data.link_url)
    if data.parent_id is not None:
        parent = get_menu_item(db, data.parent_id)
        if parent.menu_id != menu_id:
            raise BusinessRuleError(
                "A menu item's parent must belong to the same menu.",
                code="parent_menu_mismatch",
            )
    item = MenuItem(
        menu_id=menu_id,
        parent_id=data.parent_id,
        link_type=data.link_type,
        link_target_id=data.link_target_id,
        link_url=data.link_url,
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
    fields = data.model_dump(exclude_unset=True, exclude={"translations"})

    # Validate against the values the row will actually hold, not just what was
    # sent — changing link_type alone must still satisfy the target/url rule.
    link_type = fields.get("link_type", item.link_type)
    _check_choice(link_type, MENU_ITEM_LINK_TYPES, "link_type")
    _check_link(
        link_type,
        fields.get("link_target_id", item.link_target_id),
        fields.get("link_url", item.link_url),
    )
    if fields.get("parent_id") == item.id:
        raise BusinessRuleError("A menu item cannot be its own parent.", code="self_parent")

    for field, value in fields.items():
        setattr(item, field, value)

    if data.translations is not None:
        _sync_menu_item_translations(db, item, data.translations)

    db.commit()
    db.refresh(item)
    return item


def delete_menu_item(db: Session, item_id: int) -> None:
    """Remove a nav entry, and any entries nested under it.

    Children are removed explicitly because menu_items.parent_id has no cascade
    — left alone they would keep pointing at a row that no longer exists and
    quietly vanish from the rendered menu instead of being deleted honestly.
    Nothing outside the menu references an item, so this is a real delete.
    """
    item = get_menu_item(db, item_id)
    children = db.execute(select(MenuItem).where(MenuItem.parent_id == item_id)).scalars().all()
    for child in children:
        db.delete(child)
    db.delete(item)
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
    """The page that answers to this slug in ANY language, rendered in the one
    asked for.

    Slugs are per-locale, so /ar/pages/contact-us — what the language switch
    produces from the English page, and what anyone sharing that link sends —
    would otherwise 404 even though the page exists in Arabic. Same rule the
    catalog uses.
    """
    stmt = (
        select(Page)
        .join(PageTranslation, PageTranslation.page_id == Page.id)
        .options(selectinload(Page.translations))
        .where(PageTranslation.slug == slug, Page.status == "published")
        # This locale's own slug wins when both languages happen to use it.
        .order_by((PageTranslation.locale == locale).desc())
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


def update_page(db: Session, page_id: int, data) -> Page:
    page = get_page(db, page_id)
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


def create_page(db: Session, data) -> Page:
    """Create a page. `code` is the stable handle menus link to, so it has to be
    unique across pages the same way a seeded one is."""
    _check_choice(data.status, PAGE_STATUSES, "status")
    _check_choice(data.template, PAGE_TEMPLATES, "template")
    existing = db.execute(select(Page).where(Page.code == data.code)).scalar_one_or_none()
    if existing is not None:
        raise ConflictError(
            f"A page with code '{data.code}' already exists.", code="duplicate_page_code"
        )
    page = Page(code=data.code, template=data.template, status=data.status)
    if data.status == "published":
        page.published_at = datetime.now(timezone.utc)
    db.add(page)
    db.flush()
    _sync_page_translations(db, page, data.translations)
    db.commit()
    db.refresh(page)
    return page


def delete_page(db: Session, page_id: int) -> deletion.DeletionResult:
    """Remove a page, or unpublish it if a menu still links to it.

    A menu item pointing at a deleted page would render a nav link straight to a
    404, and menu_items.link_target_id is a plain integer with no FK to enforce
    otherwise — so the check has to live here.
    """
    page = get_page(db, page_id)
    blockers = deletion.find_blockers(
        db,
        [
            (
                "menu_links",
                select(MenuItem.id).where(
                    MenuItem.link_type == "page", MenuItem.link_target_id == page_id
                ),
            )
        ],
    )
    if blockers:
        page.status = "draft"
        page.published_at = None
        db.commit()
        return deletion.DeletionResult(deletion.DEACTIVATED, blockers)
    # page_translations cascades on the FK.
    db.delete(page)
    db.commit()
    return deletion.DeletionResult(deletion.DELETED)
