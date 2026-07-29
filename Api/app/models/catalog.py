from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CHAR,
    Date,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    TIMESTAMP,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import LTREE, Base, TimestampMixin


class Media(Base, TimestampMixin):
    __tablename__ = "media"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    storage_key: Mapped[str] = mapped_column(nullable=False, unique=True)
    original_filename: Mapped[str | None] = mapped_column(nullable=True)
    mime_type: Mapped[str] = mapped_column(nullable=False)
    width_px: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height_px: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    checksum_sha256: Mapped[str | None] = mapped_column(nullable=True)
    derivatives: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    processing_status: Mapped[str] = mapped_column(nullable=False, default="pending")
    uploaded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index("ix_media_checksum_sha256", "checksum_sha256"),
        Index("ix_media_processing_status", "processing_status"),
    )


class Brand(Base, TimestampMixin):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    logo_media_id: Mapped[int | None] = mapped_column(ForeignKey("media.id"), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    translations: Mapped[list["BrandTranslation"]] = relationship(
        back_populates="brand", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_brands_is_active", "is_active"),)


class BrandTranslation(Base, TimestampMixin):
    __tablename__ = "brand_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    locale: Mapped[str] = mapped_column(nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)
    slug: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(nullable=True)
    meta_title: Mapped[str | None] = mapped_column(nullable=True)
    meta_description: Mapped[str | None] = mapped_column(nullable=True)

    brand: Mapped["Brand"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("brand_id", "locale", name="uq_brand_translations_brand_locale"),
        UniqueConstraint("locale", "slug", name="uq_brand_translations_locale_slug"),
    )


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    dimension: Mapped[str] = mapped_column(nullable=False)
    path: Mapped[str] = mapped_column(LTREE, nullable=False)
    depth: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    image_media_id: Mapped[int | None] = mapped_column(ForeignKey("media.id"), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    show_in_menu: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    children: Mapped[list["Category"]] = relationship(back_populates="parent")
    parent: Mapped["Category"] = relationship(back_populates="children", remote_side=[id])
    translations: Mapped[list["CategoryTranslation"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_categories_parent_id", "parent_id"),
        Index("ix_categories_dimension", "dimension"),
        Index("ix_categories_path", "path"),
        Index("ix_categories_is_active", "is_active"),
    )


class CategoryTranslation(Base, TimestampMixin):
    __tablename__ = "category_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)
    slug: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(nullable=True)
    meta_title: Mapped[str | None] = mapped_column(nullable=True)
    meta_description: Mapped[str | None] = mapped_column(nullable=True)

    category: Mapped["Category"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("category_id", "locale", name="uq_category_translations_category_locale"),
        UniqueConstraint("locale", "slug", name="uq_category_translations_locale_slug"),
    )


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    brand_id: Mapped[int | None] = mapped_column(ForeignKey("brands.id"), nullable=True)
    product_type: Mapped[str] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(nullable=False, default="draft")
    default_variant_id: Mapped[int | None] = mapped_column(
        ForeignKey("variants.id", use_alter=True, name="fk_products_default_variant_id"),
        nullable=True,
    )
    base_price: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    tax_class: Mapped[str] = mapped_column(nullable=False, default="standard")
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Merchandising flag, set by hand in the admin. Deliberately separate from
    # is_featured: "featured" is editorial promotion, "best seller" drives the
    # storefront's best_sellers collection and its product badge. Ranking by
    # actual order volume would need an order_items aggregate the storefront
    # has no read path to, so the buyer curates this instead.
    is_best_seller: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # When false the product is always purchasable and its stock number is
    # ignored entirely — made-to-order thobes and digital goods. Checkout skips
    # the decrement for these, so the recorded quantity is left untouched
    # rather than driven negative.
    track_inventory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    rating_avg: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    published_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    translations: Mapped[list["ProductTranslation"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    variants: Mapped[list["Variant"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        foreign_keys="Variant.product_id",
    )

    __table_args__ = (
        Index("ix_products_brand_id", "brand_id"),
        Index("ix_products_product_type", "product_type"),
        Index("ix_products_status", "status"),
        Index("ix_products_is_featured", "is_featured"),
        Index("ix_products_is_best_seller", "is_best_seller"),
        Index("ix_products_published_at", "published_at"),
    )


class ProductTranslation(Base, TimestampMixin):
    __tablename__ = "product_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)
    slug: Mapped[str] = mapped_column(nullable=False)
    short_description: Mapped[str | None] = mapped_column(nullable=True)
    description: Mapped[str | None] = mapped_column(nullable=True)
    meta_title: Mapped[str | None] = mapped_column(nullable=True)
    meta_description: Mapped[str | None] = mapped_column(nullable=True)
    search_text: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)

    product: Mapped["Product"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("product_id", "locale", name="uq_product_translations_product_locale"),
        UniqueConstraint("locale", "slug", name="uq_product_translations_locale_slug"),
        Index("ix_product_translations_search_text", "search_text", postgresql_using="gin"),
    )


class ProductMedia(Base, TimestampMixin):
    __tablename__ = "product_media"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(ForeignKey("media.id"), nullable=False)
    option_value_id: Mapped[int | None] = mapped_column(
        ForeignKey("option_values.id"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        Index("ix_product_media_product_id", "product_id"),
        Index("ix_product_media_option_value_id", "option_value_id"),
    )


class ProductCategory(Base, TimestampMixin):
    __tablename__ = "product_categories"

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Option(Base, TimestampMixin):
    __tablename__ = "options"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    input_type: Mapped[str] = mapped_column(nullable=False)
    is_filterable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    translations: Mapped[list["OptionTranslation"]] = relationship(
        back_populates="option", cascade="all, delete-orphan"
    )
    values: Mapped[list["OptionValue"]] = relationship(
        back_populates="option", cascade="all, delete-orphan"
    )


class OptionTranslation(Base):
    __tablename__ = "option_translations"

    option_id: Mapped[int] = mapped_column(
        ForeignKey("options.id", ondelete="CASCADE"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(nullable=False)

    option: Mapped["Option"] = relationship(back_populates="translations")


class OptionValue(Base, TimestampMixin):
    __tablename__ = "option_values"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    option_id: Mapped[int] = mapped_column(ForeignKey("options.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(nullable=False)
    hex_color: Mapped[str | None] = mapped_column(CHAR(7), nullable=True)
    swatch_media_id: Mapped[int | None] = mapped_column(ForeignKey("media.id"), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Values a variant already uses can never be removed (Hard Rule 4), so
    # retiring one is a flag rather than a delete. This is also what keeps
    # pre-GR8 demo values out of the admin without dropping the rows the old
    # variants still point at.
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    option: Mapped["Option"] = relationship(back_populates="values")
    translations: Mapped[list["OptionValueTranslation"]] = relationship(
        back_populates="option_value", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("option_id", "code", name="uq_option_values_option_code"),)


class OptionValueTranslation(Base):
    __tablename__ = "option_value_translations"

    option_value_id: Mapped[int] = mapped_column(
        ForeignKey("option_values.id", ondelete="CASCADE"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(nullable=False)

    option_value: Mapped["OptionValue"] = relationship(back_populates="translations")


class Variant(Base, TimestampMixin):
    __tablename__ = "variants"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    sku: Mapped[str] = mapped_column(nullable=False, unique=True)
    barcode: Mapped[str | None] = mapped_column(nullable=True, unique=True)
    price: Mapped[float | None] = mapped_column(Numeric(12, 3), nullable=True)
    compare_at_price: Mapped[float | None] = mapped_column(Numeric(12, 3), nullable=True)
    cost_price: Mapped[float | None] = mapped_column(Numeric(12, 3), nullable=True)
    weight_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    low_stock_threshold: Mapped[int | None] = mapped_column(Integer, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    discontinued_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    product: Mapped["Product"] = relationship(back_populates="variants", foreign_keys=[product_id])

    __table_args__ = (
        Index("ix_variants_product_id", "product_id"),
        Index("ix_variants_is_active", "is_active"),
    )


class VariantOptionValue(Base):
    __tablename__ = "variant_option_values"

    variant_id: Mapped[int] = mapped_column(
        ForeignKey("variants.id", ondelete="CASCADE"), primary_key=True
    )
    option_value_id: Mapped[int] = mapped_column(
        ForeignKey("option_values.id", ondelete="CASCADE"), primary_key=True
    )


class VariantMedia(Base, TimestampMixin):
    __tablename__ = "variant_media"

    variant_id: Mapped[int] = mapped_column(
        ForeignKey("variants.id", ondelete="CASCADE"), primary_key=True
    )
    media_id: Mapped[int] = mapped_column(ForeignKey("media.id", ondelete="CASCADE"), primary_key=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Attribute(Base, TimestampMixin):
    __tablename__ = "attributes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    data_type: Mapped[str] = mapped_column(nullable=False)
    is_filterable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    translations: Mapped[list["AttributeTranslation"]] = relationship(
        back_populates="attribute", cascade="all, delete-orphan"
    )


class AttributeTranslation(Base):
    __tablename__ = "attribute_translations"

    attribute_id: Mapped[int] = mapped_column(
        ForeignKey("attributes.id", ondelete="CASCADE"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(nullable=False)

    attribute: Mapped["Attribute"] = relationship(back_populates="translations")


class ProductAttribute(Base, TimestampMixin):
    """value_text is JSONB with locale keys ({"ar":..,"en":..}) per the workbook — an attribute
    value, not a translation row, so it's kept as specified rather than split into a
    *_translations table."""

    __tablename__ = "product_attributes"

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
    attribute_id: Mapped[int] = mapped_column(
        ForeignKey("attributes.id", ondelete="CASCADE"), primary_key=True
    )
    value_text: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    value_number: Mapped[float | None] = mapped_column(Numeric(12, 3), nullable=True)
    value_bool: Mapped[bool | None] = mapped_column(Boolean, nullable=True)


class Region(Base, TimestampMixin):
    """Not in the original table lists; added because customer_addresses.region_id is a
    NOT NULL FK to it in the workbook. Minimal lookup table only."""

    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    country_code: Mapped[str] = mapped_column(CHAR(2), nullable=False)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    name_ar: Mapped[str] = mapped_column(nullable=False)
    name_en: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (Index("ix_regions_country_code", "country_code"),)


class Carrier(Base, TimestampMixin):
    __tablename__ = "carriers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(nullable=False, unique=True)
    name_ar: Mapped[str] = mapped_column(nullable=False)
    name_en: Mapped[str] = mapped_column(nullable=False)
    tracking_url_template: Mapped[str | None] = mapped_column(nullable=True)
    credentials_ref: Mapped[str | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class TaxRate(Base, TimestampMixin):
    __tablename__ = "tax_rates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    country_code: Mapped[str] = mapped_column(CHAR(2), nullable=False)
    tax_class: Mapped[str] = mapped_column(nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    is_inclusive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    valid_from: Mapped[datetime] = mapped_column(Date, nullable=False)
    valid_to: Mapped[datetime | None] = mapped_column(Date, nullable=True)

    __table_args__ = (
        Index("ix_tax_rates_country_code", "country_code"),
        Index("ix_tax_rates_tax_class", "tax_class"),
        Index("ix_tax_rates_valid_from", "valid_from"),
    )


class StoreLocation(Base, TimestampMixin):
    __tablename__ = "store_locations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False, unique=True)
    name_ar: Mapped[str] = mapped_column(nullable=False)
    name_en: Mapped[str] = mapped_column(nullable=False)
    address_ar: Mapped[str] = mapped_column(nullable=False)
    address_en: Mapped[str] = mapped_column(nullable=False)
    city: Mapped[str] = mapped_column(nullable=False)
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    phone: Mapped[str | None] = mapped_column(nullable=True)
    opening_hours: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    accepts_returns: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_pickup_point: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("ix_store_locations_city", "city"),
        Index("ix_store_locations_is_active", "is_active"),
    )
