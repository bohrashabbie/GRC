"""Public, read-only storefront projections over the admin-owned catalog.

The storefront contract deliberately resolves translations, effective prices,
availability, media URLs, and merchandising badges here.  Browser components
never reproduce those business rules.
"""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import kuwait
from app.middleware.error import NotFoundError
from app.models.cms import PageTranslation
from app.models.catalog import (
    Attribute,
    AttributeTranslation,
    Brand,
    Category,
    CategoryTranslation,
    Media,
    Option,
    OptionValue,
    Product,
    ProductAttribute,
    ProductCategory,
    ProductMedia,
    ProductTranslation,
    Region,
    StoreLocation,
    VariantOptionValue,
)
from app.services import cms_service, inventory_service


def locale_from_header(value: str | None) -> str:
    return "en" if value and value.lower().startswith("en") else "ar"


def _translated(rows: Iterable, locale: str, field: str, fallback: str = "") -> str:
    rows = list(rows)
    for wanted in (locale, "ar", "en"):
        row = next((item for item in rows if item.locale == wanted), None)
        if row is not None and getattr(row, field, None):
            return str(getattr(row, field))
    return fallback


def _translation_row(rows: Iterable, locale: str):
    rows = list(rows)
    return next((row for row in rows if row.locale == locale), None) or next(iter(rows), None)


def _money(value: Decimal | int | str) -> str:
    return f"{Decimal(value):.3f}"


def _csv(value: str | None) -> set[str]:
    return {item.strip() for item in (value or "").split(",") if item.strip()}


@dataclass
class CatalogData:
    products: list[Product]
    brands: dict[int, Brand]
    product_media: dict[int, list[ProductMedia]]
    media: dict[int, Media]
    product_categories: dict[int, list[int]]
    variant_values: dict[int, list[int]]
    option_values: dict[int, OptionValue]
    options: dict[int, Option]
    availability: dict[int, int]
    product_attributes: dict[int, list[tuple[ProductAttribute, Attribute]]]
    # product_id -> track_inventory. False means the product is always
    # purchasable and its quantity is never consulted.
    tracked: dict[int, bool]


def _load_catalog(db: Session) -> CatalogData:
    products = list(
        db.execute(
            select(Product)
            .where(Product.status == "active")
            .options(selectinload(Product.translations), selectinload(Product.variants))
        )
        .unique()
        .scalars()
        .all()
    )
    product_ids = [product.id for product in products]
    variant_ids = [variant.id for product in products for variant in product.variants if variant.is_active]

    brand_ids = {product.brand_id for product in products if product.brand_id is not None}
    brands = {
        brand.id: brand
        for brand in db.execute(
            select(Brand).where(Brand.id.in_(brand_ids)).options(selectinload(Brand.translations))
        ).scalars()
    } if brand_ids else {}

    links = list(
        db.execute(
            select(ProductMedia)
            .where(ProductMedia.product_id.in_(product_ids))
            .order_by(ProductMedia.is_primary.desc(), ProductMedia.sort_order, ProductMedia.id)
        ).scalars()
    ) if product_ids else []
    product_media: dict[int, list[ProductMedia]] = {}
    for link in links:
        product_media.setdefault(link.product_id, []).append(link)

    category_rows = list(
        db.execute(select(ProductCategory).where(ProductCategory.product_id.in_(product_ids))).scalars()
    ) if product_ids else []
    product_categories: dict[int, list[int]] = {}
    for row in sorted(category_rows, key=lambda item: item.sort_order):
        product_categories.setdefault(row.product_id, []).append(row.category_id)

    vv_rows = list(
        db.execute(select(VariantOptionValue).where(VariantOptionValue.variant_id.in_(variant_ids))).scalars()
    ) if variant_ids else []
    variant_values: dict[int, list[int]] = {}
    value_ids: set[int] = set()
    for row in vv_rows:
        variant_values.setdefault(row.variant_id, []).append(row.option_value_id)
        value_ids.add(row.option_value_id)

    option_values = {
        value.id: value
        for value in db.execute(
            select(OptionValue)
            .where(OptionValue.id.in_(value_ids))
            .options(selectinload(OptionValue.translations))
        ).scalars()
    } if value_ids else {}
    option_ids = {value.option_id for value in option_values.values()}
    options = {
        option.id: option
        for option in db.execute(
            select(Option)
            .where(Option.id.in_(option_ids))
            .options(selectinload(Option.translations))
        ).scalars()
    } if option_ids else {}

    media_ids = {link.media_id for link in links}
    media_ids.update(value.swatch_media_id for value in option_values.values() if value.swatch_media_id)
    media = {
        item.id: item for item in db.execute(select(Media).where(Media.id.in_(media_ids))).scalars()
    } if media_ids else {}

    # One number per variant, from the same single location checkout decrements.
    # Summing several locations here would let the page advertise more than
    # checkout could actually take.
    availability = inventory_service.stock_map(db, variant_ids)

    attribute_rows = db.execute(
        select(ProductAttribute, Attribute)
        .join(Attribute, Attribute.id == ProductAttribute.attribute_id)
        .where(ProductAttribute.product_id.in_(product_ids))
    ).all() if product_ids else []
    product_attributes: dict[int, list[tuple[ProductAttribute, Attribute]]] = {}
    for value, attribute in attribute_rows:
        product_attributes.setdefault(value.product_id, []).append((value, attribute))

    return CatalogData(
        products=products,
        brands=brands,
        product_media=product_media,
        media=media,
        product_categories=product_categories,
        variant_values=variant_values,
        option_values=option_values,
        options=options,
        availability=availability,
        product_attributes=product_attributes,
        tracked={product.id: product.track_inventory for product in products},
    )


def _media_image(media: Media | None, base_url: str, alt: str | None = None) -> dict | None:
    if media is None:
        return None
    widths = sorted(
        int(width) for width in (media.derivatives or {}).keys() if str(width).isdigit()
    )
    if media.width_px and media.width_px not in widths:
        widths.append(media.width_px)
    return {
        "id": str(media.id),
        "url": f"{base_url}/uploads/{media.storage_key}",
        "alt": alt,
        "width": media.width_px or 800,
        "height": media.height_px or 1200,
        "available_widths": sorted(widths),
        "blur_data_url": None,
    }


def _effective_price(product: Product, variant) -> Decimal:
    return Decimal(variant.price if variant.price is not None else product.base_price)


def _sale_compare(product: Product, variant) -> Decimal | None:
    compare = Decimal(variant.compare_at_price) if variant.compare_at_price is not None else None
    return compare if compare is not None and compare > _effective_price(product, variant) else None


def _is_on_offer(product: Product) -> bool:
    return any(
        _sale_compare(product, variant) is not None
        for variant in product.variants
        if variant.is_active
    )


# The merchandising collections the storefront can render as a full listing.
# Membership is defined once here so a collection's rail on the home page and
# its "view all" page can never disagree about what belongs in it — which they
# did while every collection's href pointed at the category index.
COLLECTION_CODES = ("best_sellers", "new_arrivals", "offers", "featured")


def _in_collection(product: Product, code: str) -> bool:
    if code == "best_sellers":
        return product.is_best_seller
    if code == "featured":
        return product.is_featured
    if code == "offers":
        return _is_on_offer(product)
    # new_arrivals is an ordering, not a membership test — every product is in
    # it, newest first. Filtering by an age window instead would silently empty
    # the home page rail as soon as the catalogue stopped being new.
    return True


def _stock_state(quantity: int, threshold: int | None, tracked: bool = True) -> str:
    """Delegated so the storefront badge and the admin badge can never drift
    apart on what counts as low."""
    return inventory_service.stock_state(quantity, threshold, tracked)


def _card(product: Product, data: CatalogData, locale: str, base_url: str) -> dict:
    variants = [variant for variant in product.variants if variant.is_active]
    variants.sort(key=lambda item: (_effective_price(product, item), item.position, item.id))
    chosen = variants[0] if variants else None
    price = _effective_price(product, chosen) if chosen else Decimal(product.base_price)
    compare = _sale_compare(product, chosen) if chosen else None
    tracked = data.tracked.get(product.id, True)
    quantity = sum(data.availability.get(variant.id, 0) for variant in variants)
    thresholds = [variant.low_stock_threshold for variant in variants if variant.low_stock_threshold is not None]
    threshold = sum(thresholds) if thresholds else None
    translation = _translation_row(product.translations, locale)
    name = translation.name if translation else f"Product {product.id}"
    slug = translation.slug if translation else str(product.id)

    links = data.product_media.get(product.id, [])
    images = [_media_image(data.media.get(link.media_id), base_url, name) for link in links]
    images = [image for image in images if image is not None]

    brand = data.brands.get(product.brand_id) if product.brand_id else None
    brand_translation = _translation_row(brand.translations, locale) if brand else None

    colour_values: dict[int, OptionValue] = {}
    for variant in variants:
        for value_id in data.variant_values.get(variant.id, []):
            value = data.option_values.get(value_id)
            option = data.options.get(value.option_id) if value else None
            if option and option.code.lower() in {"colour", "color"}:
                colour_values[value.id] = value

    badges: list[str] = []
    if product.published_at and product.published_at >= datetime.now(timezone.utc) - timedelta(days=30):
        badges.append("new")
    if product.is_best_seller:
        badges.append("best_seller")
    if compare is not None:
        badges.append("sale")
    if tracked and quantity > 0 and threshold is not None and quantity <= threshold:
        badges.append("limited")

    return {
        "id": str(product.id),
        "slug": slug,
        "name": name,
        "brand": {
            "id": str(brand.id),
            "slug": brand_translation.slug,
            "name": brand_translation.name,
        } if brand and brand_translation else None,
        "primary_image": images[0] if images else None,
        "hover_image": images[1] if len(images) > 1 else None,
        "price": _money(price),
        "compare_at_price": _money(compare) if compare is not None else None,
        "stock_state": _stock_state(quantity, threshold, tracked),
        "colour_swatches": [
            {
                "option_value_id": str(value.id),
                "name": _translated(value.translations, locale, "label", value.code),
                "hex": value.hex_color.strip() if value.hex_color else None,
                "image": _media_image(data.media.get(value.swatch_media_id), base_url),
            }
            for value in sorted(colour_values.values(), key=lambda item: (item.sort_order, item.id))
        ],
        "badges": badges,
    }


def _category_rows(db: Session) -> list[Category]:
    return list(
        db.execute(
            select(Category)
            .where(Category.is_active.is_(True))
            .options(selectinload(Category.translations))
            .order_by(Category.sort_order, Category.id)
        ).scalars()
    )


def _category_payloads(db: Session, locale: str, base_url: str) -> tuple[list[dict], dict[int, dict]]:
    categories = _category_rows(db)
    ids = [category.id for category in categories]
    media_ids = {category.image_media_id for category in categories if category.image_media_id}
    media = {
        item.id: item for item in db.execute(select(Media).where(Media.id.in_(media_ids))).scalars()
    } if media_ids else {}
    product_sets = {category_id: set() for category_id in ids}
    category_by_id = {category.id: category for category in categories}
    if ids:
        rows = db.execute(
            select(ProductCategory.category_id, ProductCategory.product_id)
            .join(Product, Product.id == ProductCategory.product_id)
            .where(ProductCategory.category_id.in_(ids), Product.status == "active")
        ).all()
        for category_id, product_id in set(rows):
            current_id = category_id
            while current_id in category_by_id:
                product_sets[current_id].add(product_id)
                current_id = category_by_id[current_id].parent_id

    payloads: dict[int, dict] = {}
    for category in categories:
        row = _translation_row(category.translations, locale)
        name = row.name if row else category.code
        payloads[category.id] = {
            "id": str(category.id),
            "slug": row.slug if row else category.code,
            "name": name,
            "image": _media_image(media.get(category.image_media_id), base_url, name),
            "product_count": len(product_sets[category.id]),
            "children": [],
        }
    roots: list[dict] = []
    for category in categories:
        payload = payloads[category.id]
        if category.parent_id in payloads:
            payloads[category.parent_id]["children"].append(payload)
        else:
            roots.append(payload)
    return roots, payloads


def category_tree(db: Session, locale: str, base_url: str) -> list[dict]:
    return _category_payloads(db, locale, base_url)[0]


def category_by_slug(db: Session, slug: str, locale: str, base_url: str) -> dict:
    _roots, payloads = _category_payloads(db, locale, base_url)
    category = next((item for item in payloads.values() if item["slug"] == slug), None)
    if category is None:
        raise NotFoundError("Category not found")
    return category


def category_path(db: Session, slug: str, locale: str, base_url: str) -> list[dict]:
    categories = _category_rows(db)
    by_id = {category.id: category for category in categories}
    target = next(
        (
            category
            for category in categories
            if (_translation_row(category.translations, locale) and _translation_row(category.translations, locale).slug == slug)
        ),
        None,
    )
    if target is None:
        raise NotFoundError("Category not found")
    _roots, payloads = _category_payloads(db, locale, base_url)
    ancestors: list[dict] = []
    parent_id = target.parent_id
    while parent_id in by_id:
        ancestors.append(payloads[parent_id])
        parent_id = by_id[parent_id].parent_id
    return list(reversed(ancestors))


def _descendant_ids(categories: list[Category], category_id: int) -> set[int]:
    result = {category_id}
    changed = True
    while changed:
        changed = False
        for category in categories:
            if category.parent_id in result and category.id not in result:
                result.add(category.id)
                changed = True
    return result


def _cursor_encode(product_id: int) -> str:
    return base64.urlsafe_b64encode(json.dumps({"id": product_id}).encode()).decode()


def _cursor_id(cursor: str | None) -> int | None:
    if not cursor:
        return None
    try:
        return int(json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())["id"])
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return None


def _attribute_text(value: ProductAttribute, locale: str) -> str | None:
    if value.value_text:
        return value.value_text.get(locale) or value.value_text.get("en") or value.value_text.get("ar")
    if value.value_number is not None:
        return str(value.value_number)
    if value.value_bool is not None:
        return "true" if value.value_bool else "false"
    return None


def _facet_key(value: str) -> str:
    return "-".join(value.casefold().split())


def product_list(
    db: Session,
    locale: str,
    base_url: str,
    *,
    category: str | None = None,
    q: str | None = None,
    colour: str | None = None,
    size: str | None = None,
    season: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    sort: str | None = None,
    collection: str | None = None,
    cursor: str | None = None,
    limit: int = 24,
) -> dict:
    data = _load_catalog(db)
    products = list(data.products)

    if collection:
        if collection not in COLLECTION_CODES:
            raise NotFoundError("Collection not found")
        products = [product for product in products if _in_collection(product, collection)]

    if category:
        categories = _category_rows(db)
        target = next(
            (
                item
                for item in categories
                if (_translation_row(item.translations, locale) and _translation_row(item.translations, locale).slug == category)
            ),
            None,
        )
        products = [] if target is None else [
            product
            for product in products
            if set(data.product_categories.get(product.id, [])) & _descendant_ids(categories, target.id)
        ]

    if q and q.strip():
        needle = q.casefold().strip()
        products = [
            product
            for product in products
            if any(needle in row.name.casefold() or needle in row.slug.casefold() for row in product.translations)
            or any(needle in variant.sku.casefold() for variant in product.variants)
        ]

    scoped = list(products)
    requested_options = {
        "colour": _csv(colour),
        "size": _csv(size),
    }
    for code, requested in requested_options.items():
        if not requested:
            continue
        products = [
            product
            for product in products
            if any(
                data.options.get(value.option_id)
                and data.options[value.option_id].code.lower() in ({"colour", "color"} if code == "colour" else {code})
                and value.code in requested
                for variant in product.variants
                if variant.is_active
                for value_id in data.variant_values.get(variant.id, [])
                if (value := data.option_values.get(value_id)) is not None
            )
        ]

    requested_seasons = _csv(season)
    if requested_seasons:
        products = [
            product
            for product in products
            if any(
                attribute.code.casefold() == "season"
                and (text := _attribute_text(value, locale)) is not None
                and _facet_key(text) in requested_seasons
                for value, attribute in data.product_attributes.get(product.id, [])
            )
        ]

    cards = [(product, _card(product, data, locale, base_url)) for product in products]
    if min_price is not None:
        cards = [item for item in cards if Decimal(item[1]["price"]) >= min_price]
    if max_price is not None:
        cards = [item for item in cards if Decimal(item[1]["price"]) <= max_price]

    if sort == "price_asc":
        cards.sort(key=lambda item: (Decimal(item[1]["price"]), item[0].id))
    elif sort == "price_desc":
        cards.sort(key=lambda item: (Decimal(item[1]["price"]), item[0].id), reverse=True)
    elif sort == "rating":
        cards.sort(key=lambda item: (Decimal(item[0].rating_avg or 0), item[0].id), reverse=True)
    else:
        cards.sort(key=lambda item: (item[0].published_at or item[0].created_at, item[0].id), reverse=True)

    total_count = len(cards)
    after_id = _cursor_id(cursor)
    if after_id is not None:
        index = next((index for index, item in enumerate(cards) if item[0].id == after_id), -1)
        if index >= 0:
            cards = cards[index + 1 :]
    page = cards[:limit]
    next_cursor = _cursor_encode(page[-1][0].id) if len(cards) > limit and page else None

    scoped_cards = [_card(product, data, locale, base_url) for product in scoped]
    colour_counts: dict[int, int] = {}
    size_counts: dict[int, int] = {}
    season_counts: dict[str, dict[str, str | int]] = {}
    for product in scoped:
        seen: set[int] = set()
        for variant in product.variants:
            for value_id in data.variant_values.get(variant.id, []):
                if value_id in seen:
                    continue
                seen.add(value_id)
                value = data.option_values.get(value_id)
                option = data.options.get(value.option_id) if value else None
                if not value or not option:
                    continue
                if option.code.lower() in {"colour", "color"}:
                    colour_counts[value_id] = colour_counts.get(value_id, 0) + 1
                if option.code.lower() == "size":
                    size_counts[value_id] = size_counts.get(value_id, 0) + 1
        for value, attribute in data.product_attributes.get(product.id, []):
            if attribute.code.casefold() != "season":
                continue
            text = _attribute_text(value, locale)
            if not text:
                continue
            key = _facet_key(text)
            season_counts[key] = {
                "label": text,
                "count": int(season_counts.get(key, {}).get("count", 0)) + 1,
            }

    def option_facet(code: str, counts: dict[int, int], facet_type: str) -> dict:
        label = {"colour": {"ar": "اللون", "en": "Colour"}, "size": {"ar": "المقاس", "en": "Size"}}[code][locale]
        return {
            "code": code,
            "label": label,
            "type": facet_type,
            "values": [
                {
                    "value": data.option_values[value_id].code,
                    "label": _translated(data.option_values[value_id].translations, locale, "label", data.option_values[value_id].code),
                    "count": count,
                    "hex": data.option_values[value_id].hex_color.strip() if data.option_values[value_id].hex_color else None,
                }
                for value_id, count in sorted(counts.items(), key=lambda item: data.option_values[item[0]].sort_order)
            ],
            "range": None,
        }

    prices = [Decimal(card["price"]) for card in scoped_cards]
    facets = [
        option_facet("colour", colour_counts, "swatch"),
        option_facet("size", size_counts, "checkbox"),
        {
            "code": "season",
            "label": "الموسم" if locale == "ar" else "Season",
            "type": "checkbox",
            "values": [
                {"value": key, "label": item["label"], "count": item["count"], "hex": None}
                for key, item in sorted(season_counts.items())
            ],
            "range": None,
        },
        {
            "code": "price",
            "label": "السعر" if locale == "ar" else "Price",
            "type": "range",
            "values": [],
            "range": {
                "min": _money(min(prices)) if prices else "0.00",
                "max": _money(max(prices)) if prices else "0.00",
            },
        },
    ]
    return {
        "items": [item[1] for item in page],
        "next_cursor": next_cursor,
        "facets": facets,
        "total_count": total_count,
        "applied": {
            "colour": sorted(requested_options["colour"]),
            "size": sorted(requested_options["size"]),
            "season": sorted(requested_seasons),
        },
    }


def product_detail(db: Session, slug: str, locale: str, base_url: str) -> dict:
    data = _load_catalog(db)
    product = next(
        (
            item
            for item in data.products
            if (_translation_row(item.translations, locale) and _translation_row(item.translations, locale).slug == slug)
        ),
        None,
    )
    if product is None:
        raise NotFoundError("Product not found")
    card = _card(product, data, locale, base_url)
    translation = _translation_row(product.translations, locale)
    variants = sorted((item for item in product.variants if item.is_active), key=lambda item: (item.position, item.id))

    used_option_ids = {
        data.option_values[value_id].option_id
        for variant in variants
        for value_id in data.variant_values.get(variant.id, [])
        if value_id in data.option_values
    }
    options = []
    for option_id in sorted(used_option_ids, key=lambda item: (data.options[item].sort_order, item)):
        option = data.options[option_id]
        value_ids = {
            value_id
            for variant in variants
            for value_id in data.variant_values.get(variant.id, [])
            if value_id in data.option_values and data.option_values[value_id].option_id == option_id
        }
        options.append({
            "id": str(option.id),
            "code": option.code,
            "name": _translated(option.translations, locale, "label", option.code),
            "input_type": option.input_type if option.input_type in {"swatch", "button", "dropdown"} else "button",
            "values": [
                {
                    "id": str(value.id),
                    "name": _translated(value.translations, locale, "label", value.code),
                    "hex": value.hex_color.strip() if value.hex_color else None,
                    "image": _media_image(data.media.get(value.swatch_media_id), base_url),
                    "length_cm": value.length_cm,
                    "width_cm": value.width_cm,
                }
                for value in sorted((data.option_values[value_id] for value_id in value_ids), key=lambda item: (item.sort_order, item.id))
            ],
        })

    tracked = data.tracked.get(product.id, True)
    variant_payloads = []
    for variant in variants:
        quantity = data.availability.get(variant.id, 0)
        effective = _effective_price(product, variant)
        compare = _sale_compare(product, variant)
        coordinates = {
            str(data.option_values[value_id].option_id): str(value_id)
            for value_id in data.variant_values.get(variant.id, [])
            if value_id in data.option_values
        }
        variant_payloads.append({
            "id": str(variant.id),
            "sku": variant.sku,
            "price": _money(effective),
            "compare_at_price": _money(compare) if compare is not None else None,
            "stock_state": _stock_state(quantity, variant.low_stock_threshold, tracked),
            # Always the real number when the product is tracked, so the
            # quantity stepper has a ceiling to clamp to. It used to be sent
            # only below the low-stock threshold, which left the stepper
            # uncapped for exactly the variants that could still be oversold.
            # Null means genuinely uncapped — made-to-order and digital.
            "available_quantity": quantity if tracked else None,
            "option_values": coordinates,
        })

    links = data.product_media.get(product.id, [])
    media_payload = []
    for link in links:
        image = _media_image(data.media.get(link.media_id), base_url, card["name"])
        if image:
            media_payload.append({**image, "option_value_id": str(link.option_value_id) if link.option_value_id else None})

    attribute_rows = db.execute(
        select(ProductAttribute, Attribute)
        .join(Attribute, Attribute.id == ProductAttribute.attribute_id)
        .where(ProductAttribute.product_id == product.id)
        .order_by(Attribute.sort_order, Attribute.id)
    ).all()
    attribute_ids = [attribute.id for _value, attribute in attribute_rows]
    translations = db.execute(
        select(AttributeTranslation).where(AttributeTranslation.attribute_id.in_(attribute_ids))
    ).scalars().all() if attribute_ids else []
    by_attribute: dict[int, list] = {}
    for row in translations:
        by_attribute.setdefault(row.attribute_id, []).append(row)
    attributes = []
    for value, attribute in attribute_rows:
        if value.value_text is not None:
            rendered = value.value_text.get(locale) or value.value_text.get("ar") or value.value_text.get("en") or ""
        elif value.value_number is not None:
            rendered = str(value.value_number)
        else:
            rendered = ("نعم" if locale == "ar" else "Yes") if value.value_bool else ("لا" if locale == "ar" else "No")
        attributes.append({
            "code": attribute.code,
            "name": _translated(by_attribute.get(attribute.id, []), locale, "label", attribute.code),
            "value": rendered,
            "group": None,
        })

    category_ids = data.product_categories.get(product.id, [])
    categories = _category_rows(db)
    category_by_id = {item.id: item for item in categories}
    primary = category_by_id.get(category_ids[0]) if category_ids else None
    breadcrumb_categories = []
    while primary is not None:
        breadcrumb_categories.append(primary)
        primary = category_by_id.get(primary.parent_id)
    breadcrumbs = [
        {
            "slug": _translation_row(item.translations, locale).slug,
            "name": _translation_row(item.translations, locale).name,
        }
        for item in reversed(breadcrumb_categories)
        if _translation_row(item.translations, locale)
    ]
    prices = [_effective_price(product, variant) for variant in variants] or [Decimal(product.base_price)]
    description = translation.description or translation.short_description or ""
    return {
        "id": str(product.id),
        "slug": card["slug"],
        "name": card["name"],
        "description_html": description,
        "brand": card["brand"],
        "breadcrumbs": breadcrumbs,
        "options": options,
        "variants": variant_payloads,
        "media": media_payload,
        "attributes": attributes,
        "price_range": {"min": _money(min(prices)), "max": _money(max(prices))},
        "rating": {"average": float(product.rating_avg), "count": product.rating_count} if product.rating_avg is not None and product.rating_count else None,
        "seo": {
            "title": translation.meta_title or translation.name,
            "description": translation.meta_description or (translation.short_description or ""),
            "canonical_path": f"/p/{translation.slug}",
            "alternates": {
                row.locale: f"/{row.locale}/p/{row.slug}" for row in product.translations if row.locale in {"ar", "en"}
            },
            "json_ld": None,
        },
    }


def variant_stock(db: Session, variant_ids: list[int]) -> list[dict]:
    """Live quantities for a set of variants, for the cart to clamp against
    just before submit. The product page's number can be minutes old by the
    time someone reaches checkout, and this is cheap enough to ask again."""
    quantities = inventory_service.stock_map(db, variant_ids)
    rows = db.execute(
        select(Variant.id, Variant.low_stock_threshold, Product.track_inventory)
        .join(Product, Product.id == Variant.product_id)
        .where(Variant.id.in_(variant_ids))
    ).all()
    by_variant = {variant_id: (threshold, tracked) for variant_id, threshold, tracked in rows}

    result = []
    for variant_id in variant_ids:
        threshold, tracked = by_variant.get(variant_id, (None, True))
        quantity = quantities.get(variant_id, 0)
        result.append({
            "variant_id": variant_id,
            "quantity": quantity,
            "stock_state": inventory_service.stock_state(quantity, threshold, tracked),
            "max_quantity": quantity if tracked else None,
        })
    return result


def product_slugs(db: Session, locale: str) -> list[str]:
    return list(
        db.execute(
            select(ProductTranslation.slug)
            .join(Product, Product.id == ProductTranslation.product_id)
            .where(Product.status == "active", ProductTranslation.locale == locale)
            .order_by(ProductTranslation.slug)
        ).scalars()
    )


def related_products(db: Session, slug: str, locale: str, base_url: str, limit: int = 8) -> list[dict]:
    data = _load_catalog(db)
    product = next(
        (item for item in data.products if any(row.locale == locale and row.slug == slug for row in item.translations)),
        None,
    )
    if product is None:
        raise NotFoundError("Product not found")
    category_ids = set(data.product_categories.get(product.id, []))
    related = [
        item for item in data.products
        if item.id != product.id and category_ids & set(data.product_categories.get(item.id, []))
    ]
    related.sort(key=lambda item: (item.is_best_seller, item.published_at or item.created_at), reverse=True)
    return [_card(item, data, locale, base_url) for item in related[:limit]]


_COLLECTIONS = {
    "best_sellers": {
        "ar": ("الأكثر مبيعًا", "ما يختاره عملاؤنا أكثر من غيره"),
        "en": ("Best Sellers", "What our customers reach for most"),
    },
    "new_arrivals": {
        "ar": ("وصل حديثًا", "أحدث القطع في المتجر"),
        "en": ("New Arrivals", "The newest pieces in store"),
    },
    "offers": {
        "ar": ("العروض", "أسعار مميزة لفترة محدودة"),
        "en": ("Offers", "Special prices for a limited time"),
    },
}


def collection(db: Session, code: str, locale: str, base_url: str) -> dict:
    if code not in COLLECTION_CODES:
        raise NotFoundError("Collection not found")

    data = _load_catalog(db)
    products = [item for item in data.products if _in_collection(item, code)]
    # Newest first for every collection, so the rail leads with the freshest
    # stock rather than whatever order the catalogue happened to load in.
    products.sort(key=lambda item: (item.published_at or item.created_at, item.id), reverse=True)
    total = len(products)

    title, subtitle = _COLLECTIONS.get(code, {}).get(locale, (code.replace("_", " ").title(), None))
    return {
        "id": code,
        "code": code,
        "title": title,
        "subtitle": subtitle,
        # Its own listing page. This used to be "/c" for every collection,
        # which sent "view all best sellers" to the category index.
        "href": f"/collections/{code}",
        "total_count": total,
        "products": [_card(item, data, locale, base_url) for item in products[:8]],
    }


def stores(db: Session, locale: str) -> list[dict]:
    rows = db.execute(
        select(StoreLocation).where(StoreLocation.is_active.is_(True)).order_by(StoreLocation.city, StoreLocation.id)
    ).scalars()
    result = []
    for row in rows:
        raw_hours = row.opening_hours or []
        if isinstance(raw_hours, dict):
            raw_hours = raw_hours.get("days", [])
        result.append({
            "id": str(row.id),
            "name": row.name_en if locale == "en" else row.name_ar,
            "city": row.city,
            "address_line": row.address_en if locale == "en" else row.address_ar,
            "phone": row.phone,
            "latitude": float(row.latitude) if row.latitude is not None else None,
            "longitude": float(row.longitude) if row.longitude is not None else None,
            "accepts_returns": row.accepts_returns,
            "opening_hours": raw_hours,
        })
    return result


def regions(db: Session, locale: str) -> list[dict]:
    """Kuwait's six governorates, keyed by slug.

    Served from the reference list rather than the regions table because the
    table's numeric ids never matched the area list's slugs, which left the
    city dropdown permanently empty and checkout impossible to complete. One
    vocabulary for both dropdowns is the fix.
    """
    return kuwait.governorates(locale)


def cities(db: Session, locale: str, region_id: str | None = None) -> list[dict]:
    """Areas within a governorate. `region_id` is the governorate slug that
    regions() returns."""
    return kuwait.areas(locale, region_id)


# --------------------------------------------------------------------------- #
# CMS projections: banners, menus, static pages                                #
# --------------------------------------------------------------------------- #


def _cms_translation(rows: Iterable, locale: str):
    """Requested locale, falling back to Arabic then to whatever exists."""
    by_locale = {row.locale: row for row in rows}
    return by_locale.get(locale) or by_locale.get("ar") or next(iter(by_locale.values()), None)


def _resolve_href(db: Session, link_type: str | None, target_id: int | None, url: str | None, locale: str) -> str | None:
    """Turn a typed link into a storefront path. Unroutable types fall back to
    link_url so a banner never renders a dead href."""
    if link_type is None:
        return url
    if link_type == "url":
        return url
    if link_type == "category" and target_id is not None:
        row = db.execute(
            select(CategoryTranslation).where(
                CategoryTranslation.category_id == target_id,
                CategoryTranslation.locale == locale,
            )
        ).scalars().first()
        return f"/c/{row.slug}" if row else url
    if link_type == "product" and target_id is not None:
        row = db.execute(
            select(ProductTranslation).where(
                ProductTranslation.product_id == target_id,
                ProductTranslation.locale == locale,
            )
        ).scalars().first()
        return f"/p/{row.slug}" if row else url
    if link_type == "page" and target_id is not None:
        row = db.execute(
            select(PageTranslation).where(
                PageTranslation.page_id == target_id, PageTranslation.locale == locale
            )
        ).scalars().first()
        return f"/pages/{row.slug}" if row else url
    return url


def banners(db: Session, placement: str, locale: str, base_url: str) -> list[dict]:
    result = []
    for row in cms_service.active_banners(db, placement):
        text = _cms_translation(row.translations, locale)
        alt = text.alt_text if text else None
        desktop = _media_image(db.get(Media, row.media_desktop_id), base_url, alt) if row.media_desktop_id else None
        if desktop is None:
            # desktop_image is non-nullable in the storefront contract; a banner
            # without artwork is a half-configured draft, not a slide.
            continue
        mobile = _media_image(db.get(Media, row.media_mobile_id), base_url, alt) if row.media_mobile_id else None
        result.append({
            "id": str(row.id),
            "placement": row.placement,
            "title": text.headline if text else None,
            "subtitle": text.subheadline if text else None,
            "cta_label": text.cta_label if text else None,
            "cta_href": _resolve_href(db, row.link_type, row.link_target_id, row.link_url, locale),
            "desktop_image": desktop,
            "mobile_image": mobile,
            "text_theme": row.text_theme,
            "sort_order": row.sort_order,
        })
    return result


def menu(db: Session, code: str, locale: str) -> dict:
    row = cms_service.get_menu_by_code(db, code)
    if not row.is_active:
        raise NotFoundError("Menu not found")

    items = [item for item in row.items if item.is_active]
    by_parent: dict[int | None, list] = {}
    for item in items:
        by_parent.setdefault(item.parent_id, []).append(item)

    def build(parent_id: int | None) -> list[dict]:
        children = sorted(by_parent.get(parent_id, []), key=lambda i: (i.sort_order, i.id))
        out = []
        for item in children:
            text = _cms_translation(item.translations, locale)
            out.append({
                "id": str(item.id),
                "label": text.label if text else "",
                "href": _resolve_href(db, item.link_type, item.link_target_id, item.link_url, locale) or "#",
                "children": build(item.id),
            })
        return out

    return {"code": row.code, "title": row.code, "items": build(None)}


def page(db: Session, slug: str, locale: str) -> dict:
    row = cms_service.get_published_page_by_slug(db, slug, locale)
    text = _cms_translation(row.translations, locale)
    return {
        "slug": text.slug if text else slug,
        "title": text.title if text else "",
        # The storefront renders extra blocks per template — "contact" adds
        # the contact form under the CMS body.
        "template": row.template,
        "body_html": (text.body if text else None) or "",
        "updated_at": row.updated_at.isoformat(),
        "seo": {
            "title": (text.meta_title if text else None) or (text.title if text else ""),
            "description": (text.meta_description if text else None) or "",
            "canonical": f"/pages/{text.slug}" if text else None,
        },
    }


def page_slugs(db: Session, locale: str) -> list[str]:
    return cms_service.published_page_slugs(db, locale)
