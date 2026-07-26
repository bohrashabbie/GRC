"""Brands, categories (with the ltree tree), options, and option values.

Routers call these; they own the transaction (translations upsert + the
parent row are one commit) and the category ltree maintenance.
"""

from __future__ import annotations

import re

from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.catalog import (
    Brand,
    BrandTranslation,
    Category,
    CategoryTranslation,
    Option,
    OptionTranslation,
    OptionValue,
    OptionValueTranslation,
)
from app.utils import slugify

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

def create_brand(db: Session, data) -> Brand:
    brand = Brand(
        code=data.code, logo_media_id=data.logo_media_id, sort_order=data.sort_order, is_active=data.is_active
    )
    db.add(brand)
    db.flush()
    _sync_seo_translations(db, [], data.translations, "brand_id", brand.id, BrandTranslation)
    db.commit()
    db.refresh(brand)
    return brand


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


def deactivate_brand(db: Session, brand_id: int) -> None:
    brand = get_brand(db, brand_id)
    brand.is_active = False
    db.commit()


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


def create_category(db: Session, data) -> Category:
    path, depth = _compute_path(db, data.parent_id, data.code)
    category = Category(
        parent_id=data.parent_id,
        dimension=data.dimension,
        path=path,
        depth=depth,
        code=data.code,
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
    return category


def get_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id, options=[selectinload(Category.translations)])
    if category is None:
        raise NotFoundError("Category not found")
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
    return category


def deactivate_category(db: Session, category_id: int) -> None:
    category = get_category(db, category_id)
    category.is_active = False
    db.commit()


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

def create_option(db: Session, data) -> Option:
    option = Option(
        code=data.code, input_type=data.input_type, is_filterable=data.is_filterable, sort_order=data.sort_order
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
    for field in ("code", "input_type", "is_filterable", "sort_order"):
        value = getattr(data, field)
        if value is not None:
            setattr(option, field, value)
    if data.translations is not None:
        _sync_label_translations(db, list(option.translations), data.translations, "option_id", option.id, OptionTranslation)
    db.commit()
    db.refresh(option)
    return option


def create_option_value(db: Session, data) -> OptionValue:
    if db.get(Option, data.option_id) is None:
        raise NotFoundError("Option not found")
    value = OptionValue(
        option_id=data.option_id,
        code=data.code,
        hex_color=data.hex_color,
        swatch_media_id=data.swatch_media_id,
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
    for field in ("hex_color", "swatch_media_id"):
        if field in data.model_fields_set:
            setattr(value, field, getattr(data, field))
    if "sort_order" in data.model_fields_set and data.sort_order is not None:
        value.sort_order = data.sort_order
    if data.translations is not None:
        _sync_label_translations(
            db, list(value.translations), data.translations, "option_value_id", value.id, OptionValueTranslation
        )
    db.commit()
    db.refresh(value)
    return value
