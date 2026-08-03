from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator


# --------------------------------------------------------------------------
# Shared translation shapes
# --------------------------------------------------------------------------

class SeoTranslationIn(BaseModel):
    locale: str
    name: str
    slug: str | None = None  # auto-slugified from name per locale if omitted
    description: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None


class SeoTranslationOut(BaseModel):
    locale: str
    name: str
    slug: str
    description: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None

    model_config = {"from_attributes": True}


class LabelTranslationIn(BaseModel):
    locale: str
    label: str


class LabelTranslationOut(BaseModel):
    locale: str
    label: str

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------
# Brands
# --------------------------------------------------------------------------

class BrandCreate(BaseModel):
    code: str
    logo_media_id: int | None = None
    sort_order: int = 0
    is_active: bool = True
    translations: list[SeoTranslationIn] = Field(min_length=1)


class BrandUpdate(BaseModel):
    code: str | None = None
    logo_media_id: int | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    translations: list[SeoTranslationIn] | None = None


class BrandOut(BaseModel):
    id: int
    code: str
    logo_media_id: int | None
    sort_order: int
    is_active: bool
    created_at: datetime
    translations: list[SeoTranslationOut]

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------
# Categories
# --------------------------------------------------------------------------

class CategoryCreate(BaseModel):
    parent_id: int | None = None
    dimension: str
    code: str
    image_media_id: int | None = None
    sort_order: int = 0
    show_in_menu: bool = True
    is_active: bool = True
    translations: list[SeoTranslationIn] = Field(min_length=1)


class CategoryUpdate(BaseModel):
    parent_id: int | None = None
    dimension: str | None = None
    code: str | None = None
    image_media_id: int | None = None
    sort_order: int | None = None
    show_in_menu: bool | None = None
    is_active: bool | None = None
    translations: list[SeoTranslationIn] | None = None


class CategoryOut(BaseModel):
    id: int
    parent_id: int | None
    dimension: str
    path: str
    depth: int
    code: str
    image_media_id: int | None
    # Resolved alongside the id so a form can render the current image and a
    # list can show a thumbnail, without a request per row.
    image_key: str | None = None
    sort_order: int
    show_in_menu: bool
    is_active: bool
    created_at: datetime
    translations: list[SeoTranslationOut]

    model_config = {"from_attributes": True}


class CategoryTreeNode(BaseModel):
    id: int
    code: str
    dimension: str
    depth: int
    sort_order: int
    show_in_menu: bool
    is_active: bool
    translations: list[SeoTranslationOut]
    children: list["CategoryTreeNode"] = []

    model_config = {"from_attributes": True}


CategoryTreeNode.model_rebuild()


# --------------------------------------------------------------------------
# Options & option values
# --------------------------------------------------------------------------

class OptionCreate(BaseModel):
    code: str
    input_type: str
    is_filterable: bool = False
    sort_order: int = 0
    translations: list[LabelTranslationIn] = Field(min_length=1)


class OptionUpdate(BaseModel):
    code: str | None = None
    input_type: str | None = None
    is_filterable: bool | None = None
    sort_order: int | None = None
    translations: list[LabelTranslationIn] | None = None


class OptionOut(BaseModel):
    id: int
    code: str
    input_type: str
    is_filterable: bool
    sort_order: int
    created_at: datetime
    translations: list[LabelTranslationOut]

    model_config = {"from_attributes": True}


class OptionValueCreate(BaseModel):
    option_id: int
    code: str
    hex_color: str | None = None
    swatch_media_id: int | None = None
    # Garment measurements for size values, whole cm. Ignored for colours.
    length_cm: int | None = Field(default=None, ge=1, le=500)
    width_cm: int | None = Field(default=None, ge=1, le=500)
    sort_order: int = 0
    translations: list[LabelTranslationIn] = Field(min_length=1)


class OptionValueUpdate(BaseModel):
    hex_color: str | None = None
    swatch_media_id: int | None = None
    length_cm: int | None = Field(default=None, ge=1, le=500)
    width_cm: int | None = Field(default=None, ge=1, le=500)
    sort_order: int | None = None
    #  Retiring a value stops it being offered on new products; it is never
    #  deleted, because variants and order lines reference it (Hard Rule 4).
    is_active: bool | None = None
    translations: list[LabelTranslationIn] | None = None


class OptionValueOut(BaseModel):
    id: int
    option_id: int
    code: str
    hex_color: str | None
    swatch_media_id: int | None
    length_cm: int | None
    width_cm: int | None
    sort_order: int
    is_active: bool
    created_at: datetime
    translations: list[LabelTranslationOut]

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------
# Products
# --------------------------------------------------------------------------

class ProductTranslationIn(BaseModel):
    locale: str
    name: str
    slug: str | None = None
    short_description: str | None = None
    description: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None


class ProductTranslationOut(BaseModel):
    locale: str
    name: str
    slug: str
    short_description: str | None = None
    description: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    brand_id: int | None = None
    product_type: str
    base_price: Decimal = Field(ge=0)
    tax_class: str = "standard"
    is_featured: bool = False
    is_best_seller: bool = False
    track_inventory: bool = True
    category_ids: list[int] = []
    translations: list[ProductTranslationIn] = Field(min_length=1)


class ProductUpdate(BaseModel):
    brand_id: int | None = None
    product_type: str | None = None
    base_price: Decimal | None = Field(default=None, ge=0)
    tax_class: str | None = None
    is_featured: bool | None = None
    is_best_seller: bool | None = None
    track_inventory: bool | None = None
    category_ids: list[int] | None = None
    translations: list[ProductTranslationIn] | None = None


class ProductStatusUpdate(BaseModel):
    status: Literal["draft", "active", "archived"]


class ProductOut(BaseModel):
    id: int
    brand_id: int | None
    product_type: str
    status: str
    default_variant_id: int | None
    base_price: Decimal
    tax_class: str
    is_featured: bool
    is_best_seller: bool
    is_on_offer: bool = False
    track_inventory: bool = True
    rating_avg: Decimal | None
    rating_count: int
    published_at: datetime | None
    created_at: datetime
    translations: list[ProductTranslationOut]
    category_ids: list[int] = []
    # Summed across the product's active variants, for the list page's stock
    # column. Null on detail responses, where the per-variant numbers are the
    # useful thing and this would only be their sum.
    stock_quantity: int | None = None
    stock_state: str | None = None
    # Storage key of the product's primary gallery image, for the list
    # thumbnail. Null when nothing has been uploaded yet.
    primary_image_key: str | None = None

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------
# Variants
# --------------------------------------------------------------------------

class VariantOut(BaseModel):
    id: int
    product_id: int
    sku: str
    barcode: str | None
    price: Decimal | None
    compare_at_price: Decimal | None
    cost_price: Decimal | None
    weight_grams: int | None
    low_stock_threshold: int | None
    position: int
    is_active: bool
    discontinued_at: datetime | None
    created_at: datetime
    option_value_ids: list[int] = []
    # The one stock number. Not a column on variants — resolved from the
    # default online location's stock level, so the simple product-form input
    # and the inventory ledger can never disagree.
    stock_quantity: int = 0

    model_config = {"from_attributes": True}


class VariantUpdate(BaseModel):
    barcode: str | None = None
    weight_grams: int | None = None
    low_stock_threshold: int | None = Field(default=None, ge=0)
    position: int | None = None
    is_active: bool | None = None
    stock_quantity: int | None = Field(default=None, ge=0)


class VariantStockIn(BaseModel):
    variant_id: int
    stock_quantity: int = Field(ge=0)


class ProductStockUpdate(BaseModel):
    """Saving the product form's stock column: every variant's quantity in one
    request, so one transaction covers the whole edit rather than leaving a
    half-applied grid behind if the tab is closed mid-save."""

    items: list[VariantStockIn] = Field(min_length=1)


class VariantPriceUpdate(BaseModel):
    price: Decimal | None = Field(default=None, ge=0)
    compare_at_price: Decimal | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def compare_price_must_exceed_price(self):
        if (
            "price" in self.model_fields_set
            and "compare_at_price" in self.model_fields_set
            and self.price is not None
            and self.compare_at_price is not None
            and self.compare_at_price <= self.price
        ):
            raise ValueError("compare_at_price must be greater than price")
        return self


class VariantCombinationIn(BaseModel):
    option_value_ids: list[int] = Field(min_length=1)
    sku: str | None = None
    barcode: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    compare_at_price: Decimal | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)
    weight_grams: int | None = None

    @model_validator(mode="after")
    def compare_price_must_exceed_price(self):
        if (
            self.price is not None
            and self.compare_at_price is not None
            and self.compare_at_price <= self.price
        ):
            raise ValueError("compare_at_price must be greater than price")
        return self


class GenerateVariantsRequest(BaseModel):
    combinations: list[VariantCombinationIn] = Field(min_length=1)


# --------------------------------------------------------------------------
# Media
# --------------------------------------------------------------------------

class MediaOut(BaseModel):
    id: int
    storage_key: str
    original_filename: str | None
    mime_type: str
    width_px: int | None
    height_px: int | None
    bytes: int | None
    processing_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductMediaAttach(BaseModel):
    product_id: int
    option_value_id: int | None = None
    sort_order: int = 0
    is_primary: bool = False


class ProductMediaOut(BaseModel):
    id: int
    product_id: int
    media_id: int
    option_value_id: int | None
    sort_order: int
    is_primary: bool

    model_config = {"from_attributes": True}


class ProductMediaItemOut(ProductMediaOut):
    """A product's gallery entry with the underlying file inlined, so the admin
    can render the image without a second round trip per attachment."""

    media: MediaOut

    model_config = {"from_attributes": True}
