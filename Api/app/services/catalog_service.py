"""Brands, categories (with the ltree tree), options, and option values.

Routers call these; they own the transaction (translations upsert + the
parent row are one commit) and the category ltree maintenance.
"""

from __future__ import annotations

import re

from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, ConflictError, NotFoundError
from app.services import audit_service, deletion, media_service
from app.models.catalog import (
    Brand,
    BrandTranslation,
    Category,
    CategoryTranslation,
    Option,
    OptionTranslation,
    OptionValue,
    OptionValueTranslation,
    Product,
    ProductCategory,
    ProductMedia,
    VariantOptionValue,
)
from app.utils import slugify, unique_code

_LTREE_UNSAFE = re.compile(r"[^A-Za-z0-9_]+")


def _ltree_label(code: str) -> str:
    label = _LTREE_UNSAFE.sub("_", code).strip("_")
    return label or "n"


def _sync_seo_translations(db: Session, existing: list, translations_in: list, parent_field: str, parent_id: int, model) -> None:
    existing_by_locale = {t.locale: t for t in existing}
    seen = set()
    for t_in in translations_in:
        seen.add(t_in.locale)
        slug = t_in.slug or slugify(t_in.name, t_in.locale)
        if t_in.locale in existing_by_locale:
            row = existing_by_locale[t_in.locale]
            row.name = t_in.name
            row.slug = slug
            row.description = t_in.description
            row.meta_title = t_in.meta_title
            row.meta_description = t_in.meta_description
        else:
            db.add(
                model(
                    **{parent_field: parent_id},
                    locale=t_in.locale,
                    name=t_in.name,
                    slug=slug,
                    description=t_in.description,
                    meta_title=t_in.meta_title,
                    meta_description=t_in.meta_description,
                )
            )
    for locale, row in existing_by_locale.items():
        if locale not in seen:
            db.delete(row)


def _sync_label_translations(db: Session, existing: list, translations_in: list, parent_field: str, parent_id: int, model) -> None:
    existing_by_locale = {t.locale: t for t in existing}
    seen = set()
    for t_in in translations_in:
        seen.add(t_in.locale)
        if t_in.locale in existing_by_locale:
            existing_by_locale[t_in.locale].label = t_in.label
        else:
            db.add(model(**{parent_field: parent_id}, locale=t_in.locale, label=t_in.label))
    for locale, row in existing_by_locale.items():
        if locale not in seen:
            db.delete(row)


# --------------------------------------------------------------------------
# Brands
# --------------------------------------------------------------------------

def _auto_brand_code(db: Session, translations) -> str:
    """Derive a code for a brand the admin did not name one for.

    Codes are not something the business has — staff name a brand and nothing
    else — but brands.code is NOT NULL and unique, so one still has to exist.
    English is preferred because it slugs to ASCII; an Arabic-only brand falls
    back to its Arabic slug, and a neutral stem covers a name that slugs to
    nothing. A numeric suffix resolves any clash.
    """
    by_locale = {t.locale: t.name for t in translations}
    english = (by_locale.get("en") or "").strip()
    arabic = (by_locale.get("ar") or "").strip()
    base = slugify(english, "en") if english else slugify(arabic, "ar")
    return unique_code(db, Brand, base, "brand")


def create_brand(db: Session, data) -> Brand:
    brand = Brand(
        code=data.code or _auto_brand_code(db, data.translations),
        logo_media_id=data.logo_media_id,
        sort_order=data.sort_order,
        is_active=data.is_active,
    )
    db.add(brand)
    db.flush()
    _sync_seo_translations(db, [], data.translations, "brand_id", brand.id, BrandTranslation)
    db.commit()
    db.refresh(brand)
    return brand


def attach_brand_logo_keys(db: Session, brands: list[Brand]) -> None:
    """Resolve each brand's logo_media_id to a storage key, one query for the
    whole page."""
    keys = media_service.storage_keys(db, [brand.logo_media_id for brand in brands])
    for brand in brands:
        brand.logo_key = keys.get(brand.logo_media_id)


def get_brand(db: Session, brand_id: int) -> Brand:
    brand = db.get(Brand, brand_id, options=[selectinload(Brand.translations)])
    if brand is None:
        raise NotFoundError("Brand not found")
    return brand


def update_brand(db: Session, brand_id: int, data) -> Brand:
    brand = get_brand(db, brand_id)
    if "logo_media_id" in data.model_fields_set:
        brand.logo_media_id = data.logo_media_id
    for field in ("code", "sort_order", "is_active"):
        if field in data.model_fields_set and (value := getattr(data, field)) is not None:
            setattr(brand, field, value)
    if data.translations is not None:
        _sync_seo_translations(db, list(brand.translations), data.translations, "brand_id", brand.id, BrandTranslation)
    db.commit()
    db.refresh(brand)
    return brand


def delete_brand(db: Session, brand_id: int, *, actor_user_id: int | None) -> deletion.DeletionResult:
    """Remove the brand outright, or deactivate it if products still point at it.

    products.brand_id is nullable with no cascade, so deleting a brand a product
    uses would leave that product brand-less rather than fail — which is why the
    check is here and not left to the database.
    """
    brand = get_brand(db, brand_id)
    # Captured before the mutation below, or the audit row records the new
    # value as the old one.
    before = {"code": brand.code, "is_active": brand.is_active}
    blockers = deletion.find_blockers(
        db, [("products", select(Product.id).where(Product.brand_id == brand_id))]
    )
    if blockers:
        brand.is_active = False
        mode = deletion.DEACTIVATED
    else:
        # brand_translations cascades on the FK.
        db.delete(brand)
        mode = deletion.DELETED
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action=f"brand.{mode}",
        entity_type="brand",
        entity_id=brand_id,
        before=before,
        after=None if mode == deletion.DELETED else {"is_active": False},
    )
    db.commit()
    return deletion.DeletionResult(mode, blockers)


# --------------------------------------------------------------------------
# Categories
# --------------------------------------------------------------------------

def _compute_path(db: Session, parent_id: int | None, code: str) -> tuple[str, int]:
    label = _ltree_label(code)
    if parent_id is None:
        return label, 0
    parent = db.get(Category, parent_id)
    if parent is None:
        raise NotFoundError("Parent category not found")
    return f"{parent.path}.{label}", parent.depth + 1


def _rewrite_subtree_paths(db: Session, old_path: str, new_path: str) -> None:
    db.execute(
        text(
            "UPDATE categories SET path = CAST(:new_prefix AS ltree) || subpath(path, nlevel(CAST(:old_prefix AS ltree))), "
            "depth = nlevel(CAST(:new_prefix AS ltree) || subpath(path, nlevel(CAST(:old_prefix AS ltree)))) - 1 "
            "WHERE path <@ CAST(:old_prefix AS ltree) AND path != CAST(:old_prefix AS ltree)"
        ),
        {"old_prefix": old_path, "new_prefix": new_path},
    )


def attach_category_image_keys(db: Session, categories: list[Category]) -> None:
    """Resolve each category's image_media_id to a storage key, in one query for
    the whole page. Without it a category that has an image renders as though it
    has none, because the client only ever received the id."""
    keys = media_service.storage_keys(db, [c.image_media_id for c in categories])
    for category in categories:
        category.image_key = keys.get(category.image_media_id)


def _auto_category_code(db: Session, translations) -> str:
    """Derive the ltree label for a category the admin did not name a code for.

    Codes are not a thing the business has — staff name a category and nothing
    else. The tree still needs one, because categories.path is an ltree and
    ltree labels are ASCII-only: _ltree_label strips Arabic entirely, so an
    Arabic name would collapse every category to the same label and every
    sibling would collide. The English name is used where there is one, with a
    neutral stem otherwise, and a numeric suffix resolves any clash.
    """
    by_locale = {t.locale: t.name for t in translations}
    english = by_locale.get("en") or ""
    base = _ltree_label(slugify(english, "en")) if english.strip() else ""
    if base == "n":
        base = ""
    return unique_code(db, Category, base, "cat")


def create_category(db: Session, data) -> Category:
    code = data.code or _auto_category_code(db, data.translations)
    path, depth = _compute_path(db, data.parent_id, code)
    category = Category(
        parent_id=data.parent_id,
        dimension=data.dimension,
        path=path,
        depth=depth,
        code=code,
        image_media_id=data.image_media_id,
        sort_order=data.sort_order,
        show_in_menu=data.show_in_menu,
        is_active=data.is_active,
    )
    db.add(category)
    db.flush()
    _sync_seo_translations(db, [], data.translations, "category_id", category.id, CategoryTranslation)
    db.commit()
    db.refresh(category)
    attach_category_image_keys(db, [category])
    return category


def get_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id, options=[selectinload(Category.translations)])
    if category is None:
        raise NotFoundError("Category not found")
    attach_category_image_keys(db, [category])
    return category


def update_category(db: Session, category_id: int, data) -> Category:
    category = get_category(db, category_id)
    parent_supplied = "parent_id" in data.model_fields_set
    reparenting = parent_supplied and data.parent_id != category.parent_id
    recoding = data.code is not None and data.code != category.code
    if data.parent_id == category.id:
        raise BusinessRuleError("A category cannot be its own parent")

    if reparenting or recoding:
        new_parent_id = data.parent_id if parent_supplied else category.parent_id
        new_code = data.code if data.code is not None else category.code
        old_path = category.path
        new_path, new_depth = _compute_path(db, new_parent_id, new_code)
        if new_path == old_path:
            pass
        else:
            _rewrite_subtree_paths(db, old_path, new_path)
            category.path = new_path
            category.depth = new_depth
            category.parent_id = new_parent_id
            category.code = new_code

    if "image_media_id" in data.model_fields_set:
        category.image_media_id = data.image_media_id
    for field in ("dimension", "sort_order", "show_in_menu", "is_active"):
        if field in data.model_fields_set and (value := getattr(data, field)) is not None:
            setattr(category, field, value)

    if data.translations is not None:
        _sync_seo_translations(
            db, list(category.translations), data.translations, "category_id", category.id, CategoryTranslation
        )
    db.commit()
    db.refresh(category)
    attach_category_image_keys(db, [category])
    return category


def delete_category(db: Session, category_id: int, *, actor_user_id: int | None) -> deletion.DeletionResult:
    """Remove the category outright, or deactivate it if it still has children
    or products.

    product_categories cascades, so a delete would silently unfile every product
    in the category rather than error — counted as a blocker for that reason.
    Child categories only null out their parent_id, which would quietly promote
    a whole subtree to the root and leave its ltree paths wrong.
    """
    category = get_category(db, category_id)
    before = {"code": category.code, "is_active": category.is_active}
    blockers = deletion.find_blockers(
        db,
        [
            ("products", select(ProductCategory.product_id).where(ProductCategory.category_id == category_id)),
            ("sub_categories", select(Category.id).where(Category.parent_id == category_id)),
        ],
    )
    if blockers:
        category.is_active = False
        mode = deletion.DEACTIVATED
    else:
        # category_translations cascades on the FK.
        db.delete(category)
        mode = deletion.DELETED
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action=f"category.{mode}",
        entity_type="category",
        entity_id=category_id,
        before=before,
        after=None if mode == deletion.DELETED else {"is_active": False},
    )
    db.commit()
    return deletion.DeletionResult(mode, blockers)


def get_category_tree(db: Session, dimension: str) -> list[Category]:
    stmt = (
        select(Category)
        .where(Category.dimension == dimension)
        .options(selectinload(Category.translations))
        .order_by(Category.sort_order, Category.id)
    )
    all_categories = list(db.execute(stmt).scalars().all())
    by_id = {c.id: c for c in all_categories}
    children_map: dict[int | None, list[Category]] = {}
    for c in all_categories:
        children_map.setdefault(c.parent_id, []).append(c)

    def attach(node: Category) -> None:
        node.children = children_map.get(node.id, [])
        for child in node.children:
            attach(child)

    roots = children_map.get(None, [])
    for root in roots:
        attach(root)
    return roots


# --------------------------------------------------------------------------
# Options & option values
# --------------------------------------------------------------------------

SYSTEM_OPTION_CODES = ("colour", "size")
# Colour values carry a swatch; size values carry garment measurements
# (length/width in cm). Each field set is dropped on the other option, and
# both options are staff-editable.
SWATCH_OPTION_CODE = "colour"
SIZE_OPTION_CODE = "size"


# What the storefront's variant selector can render. It branches on "swatch"
# and falls back to a button group for anything else, so these three are the
# whole vocabulary — shop_service coerces anything unknown to "button".
# Two, because two is what the storefront can draw: colour circles, or
# labelled buttons. "dropdown" was offered for years and rendered as buttons
# anyway, so it is gone rather than left as a choice that does nothing.
OPTION_INPUT_TYPES = ("button", "swatch")


def _require_system_option(option: Option) -> None:
    """Kept as a hook for per-option rules. Colour and Size carry the swatch and
    measurement fields respectively; every other option is a plain value list,
    which the selector renders as buttons."""
    return None


def _auto_option_code(db: Session, translations) -> str:
    """Derive an option's code from its label.

    The code is a key the storefront reads (colour and size drive the swatch
    and the size guide), never something the business names. Asking staff for
    one produced an option literally called "#FFFFFF", so it is derived: the
    English label, ASCII-slugged, with a numeric suffix to settle a clash.
    """
    by_locale = {t.locale: t.label for t in translations}
    english = (by_locale.get("en") or "").strip()
    arabic = (by_locale.get("ar") or "").strip()
    base = slugify(english, "en") if english else slugify(arabic, "ar")
    return unique_code(db, Option, base, "option")


def _auto_option_value_code(db: Session, option_id: int, translations) -> str:
    """Same for a value, but unique within its option rather than globally -
    two options may each have a "small"."""
    by_locale = {t.locale: t.label for t in translations}
    english = (by_locale.get("en") or "").strip()
    arabic = (by_locale.get("ar") or "").strip()
    base = (slugify(english, "en") if english else slugify(arabic, "ar")) or "value"
    candidate = base
    suffix = 2
    taken = {
        row[0]
        for row in db.execute(
            select(OptionValue.code).where(OptionValue.option_id == option_id)
        ).all()
    }
    while candidate in taken:
        candidate = f"{base}_{suffix}"
        suffix += 1
    return candidate


def _default_input_type(code: str) -> str:
    """How the shop should draw this option's values.

    There are only two answers it can honour: colour circles, or labelled
    buttons. Asking staff to pick between "swatch", "button" and "dropdown"
    produced options set to dropdown (which renders as buttons anyway) and a
    size option set to swatch (which then asked for hex colours), so the
    choice is made here instead.
    """
    return "swatch" if code.lower() in {SWATCH_OPTION_CODE, "color"} else "button"


def create_option(db: Session, data) -> Option:
    """Options are staff-created. The selector iterates whatever options a
    product has rather than naming Colour and Size, so a third one renders
    without any storefront change; only the swatch and measurement fields stay
    tied to the two built-in codes."""
    if data.input_type is not None and data.input_type not in OPTION_INPUT_TYPES:
        raise BusinessRuleError(
            f"Unsupported input type '{data.input_type}'. Expected one of: "
            + ", ".join(OPTION_INPUT_TYPES),
            code="invalid_option_input_type",
        )
    code = data.code.strip() if data.code else _auto_option_code(db, data.translations)
    existing = db.execute(select(Option).where(Option.code == code)).scalar_one_or_none()
    if existing is not None:
        raise ConflictError(f"An option with code '{code}' already exists.", code="duplicate_option_code")

    option = Option(
        code=code,
        input_type=data.input_type or _default_input_type(code),
        is_filterable=data.is_filterable,
        sort_order=data.sort_order,
    )
    db.add(option)
    db.flush()
    _sync_label_translations(db, [], data.translations, "option_id", option.id, OptionTranslation)
    db.commit()
    db.refresh(option)
    return option


def get_option(db: Session, option_id: int) -> Option:
    option = db.get(Option, option_id, options=[selectinload(Option.translations)])
    if option is None:
        raise NotFoundError("Option not found")
    return option


def update_option(db: Session, option_id: int, data) -> Option:
    option = get_option(db, option_id)
    fields = data.model_dump(exclude_unset=True, exclude={"translations"})

    # Only what this request actually sets is checked: an option still stored
    # as the retired "dropdown" must stay editable, not fail every save.
    if fields.get("input_type") is not None and fields["input_type"] not in OPTION_INPUT_TYPES:
        raise BusinessRuleError(
            f"Unsupported input type '{fields['input_type']}'. Expected one of: "
            + ", ".join(OPTION_INPUT_TYPES),
            code="invalid_option_input_type",
        )
    if "code" in fields and fields["code"] is not None:
        fields["code"] = fields["code"].strip()
        # Colour and Size codes are what pins the swatch and measurement fields
        # to the right option, so renaming one would silently strand them.
        if option.code in SYSTEM_OPTION_CODES and fields["code"] != option.code:
            raise BusinessRuleError(
                f"'{option.code}' is a built-in option and its code cannot change.",
                code="system_option_locked",
            )
        clash = db.execute(
            select(Option).where(Option.code == fields["code"], Option.id != option_id)
        ).scalar_one_or_none()
        if clash is not None:
            raise ConflictError(
                f"An option with code '{fields['code']}' already exists.",
                code="duplicate_option_code",
            )

    for field, value in fields.items():
        if value is not None:
            setattr(option, field, value)
    if data.translations is not None:
        _sync_label_translations(
            db, list(option.translations), data.translations, "option_id", option.id, OptionTranslation
        )
    db.commit()
    db.refresh(option)
    return option


def _takes_swatch(option: Option) -> bool:
    """Swatch fields follow the input type, not the code — a staff-created
    swatch option needs them just as much as the built-in colour does."""
    return option.input_type == "swatch" or option.code == SWATCH_OPTION_CODE


def create_option_value(db: Session, data) -> OptionValue:
    option = db.get(Option, data.option_id)
    if option is None:
        raise NotFoundError("Option not found")
    _require_system_option(option)
    value = OptionValue(
        option_id=data.option_id,
        code=data.code or _auto_option_value_code(db, data.option_id, data.translations),
        # A size has no colour. Dropping the swatch here rather than trusting
        # the caller keeps a stray hex out of the storefront's colour filter,
        # which groups by hex and would otherwise show a size as a swatch.
        hex_color=data.hex_color if _takes_swatch(option) else None,
        swatch_media_id=data.swatch_media_id if _takes_swatch(option) else None,
        # The mirror of the swatch rule: a colour has no garment measurements.
        length_cm=data.length_cm if option.code == SIZE_OPTION_CODE else None,
        width_cm=data.width_cm if option.code == SIZE_OPTION_CODE else None,
        # The badge is not tied to an option kind — a size can be "New" too.
        tag=(data.tag or None),
        sort_order=data.sort_order,
    )
    db.add(value)
    db.flush()
    _sync_label_translations(db, [], data.translations, "option_value_id", value.id, OptionValueTranslation)
    db.commit()
    db.refresh(value)
    return value


def get_option_value(db: Session, option_value_id: int) -> OptionValue:
    value = db.get(OptionValue, option_value_id, options=[selectinload(OptionValue.translations)])
    if value is None:
        raise NotFoundError("Option value not found")
    return value


def update_option_value(db: Session, option_value_id: int, data) -> OptionValue:
    value = get_option_value(db, option_value_id)
    option = db.get(Option, value.option_id)
    if option is None:
        raise NotFoundError("Option not found")
    _require_system_option(option)
    if _takes_swatch(option):
        for field in ("hex_color", "swatch_media_id"):
            if field in data.model_fields_set:
                setattr(value, field, getattr(data, field))
    if option.code == SIZE_OPTION_CODE:
        for field in ("length_cm", "width_cm"):
            if field in data.model_fields_set:
                setattr(value, field, getattr(data, field))
    if "tag" in data.model_fields_set:
        value.tag = data.tag or None
    if "is_active" in data.model_fields_set and data.is_active is not None:
        value.is_active = data.is_active
    if "sort_order" in data.model_fields_set and data.sort_order is not None:
        value.sort_order = data.sort_order
    if data.translations is not None:
        _sync_label_translations(
            db, list(value.translations), data.translations, "option_value_id", value.id, OptionValueTranslation
        )
    db.commit()
    db.refresh(value)
    return value


def delete_option_value(
    db: Session, option_value_id: int, *, actor_user_id: int | None
) -> deletion.DeletionResult:
    """Remove a colour or size value, or refuse when something still uses it.

    variant_option_values cascades, so deleting a value in use would strip it
    from the variant's combination and leave that variant silently identifying
    as something else — including on orders already placed against it. Product
    media pinned to the value (the per-colour galleries) counts for the same
    reason: the FK is nullable, so those images would just drift loose.
    """
    value = get_option_value(db, option_value_id)
    before = {"code": value.code, "is_active": value.is_active}
    blockers = deletion.find_blockers(
        db,
        [
            (
                "variants",
                select(VariantOptionValue.variant_id).where(
                    VariantOptionValue.option_value_id == option_value_id
                ),
            ),
            ("product_images", select(ProductMedia.id).where(ProductMedia.option_value_id == option_value_id)),
        ],
    )
    if blockers:
        # Deleting a value a variant wears used to retire it quietly, which
        # left the value on the variant but out of the storefront's filters —
        # a half-deleted state nobody asked for. Staff would rather be told, so
        # the delete is refused with a count of what is in the way and they
        # decide what happens to those variants first.
        raise deletion.blocked("colour or size value", blockers)

    # option_value_translations cascades on the FK.
    db.delete(value)
    mode = deletion.DELETED
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action=f"option_value.{mode}",
        entity_type="option_value",
        entity_id=option_value_id,
        before=before,
        after=None if mode == deletion.DELETED else {"is_active": False},
    )
    db.commit()
    return deletion.DeletionResult(mode, blockers)


def delete_option(db: Session, option_id: int, *, actor_user_id: int | None) -> deletion.DeletionResult:
    """Remove a retired option and its values.

    Colour and Size are the two options the storefront can render, so they are
    never removable — the same reason create_option and update_option refuse.
    What this does clear is the leftover pre-GR8 rows (`length`, the duplicate
    `color`) that only still exist because variants pointed at them, and which
    _require_system_option already rejects new values for.

    Options have no is_active column, so there is no deactivate fallback: an
    option whose values are still on a variant raises instead.
    """
    option = get_option(db, option_id)
    if option.code in SYSTEM_OPTION_CODES:
        raise BusinessRuleError(
            f"'{option.code}' is one of the store's two built-in options and cannot be removed.",
            code="system_option_locked",
        )
    value_ids = select(OptionValue.id).where(OptionValue.option_id == option_id)
    blockers = deletion.find_blockers(
        db,
        [
            (
                "variants",
                select(VariantOptionValue.variant_id).where(
                    VariantOptionValue.option_value_id.in_(value_ids)
                ),
            ),
            (
                "product_images",
                select(ProductMedia.id).where(ProductMedia.option_value_id.in_(value_ids)),
            ),
        ],
    )
    if blockers:
        raise deletion.blocked("option", blockers)
    # option_values and option_translations both cascade on the FK.
    db.delete(option)
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="option.deleted",
        entity_type="option",
        entity_id=option_id,
        before={"code": option.code},
        after=None,
    )
    db.commit()
    return deletion.DeletionResult(deletion.DELETED)
