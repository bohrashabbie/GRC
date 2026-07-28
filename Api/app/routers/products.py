from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user, require
from app.models.auth import User
from app.models.catalog import Product, ProductTranslation, Variant
from app.schemas.catalog import (
    ProductCreate,
    ProductMediaItemOut,
    ProductOut,
    ProductStatusUpdate,
    ProductStockUpdate,
    ProductUpdate,
)
from app.services import media_service, product_service
from app.utils import paginate

router = APIRouter()


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("catalog.manage")),
) -> Product:
    return product_service.create_product(db, payload, current_user.id)


@router.get("")
def list_products(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    q: str | None = Query(None, description="Search product name (any locale) or variant SKU"),
    status_: str | None = Query(None, alias="status"),
    brand_id: int | None = None,
    product_type: str | None = None,
    is_featured: bool | None = None,
    is_best_seller: bool | None = None,
    is_on_offer: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.view")),
) -> dict:
    """Cursor-paginated on (created_at, id) descending. Filters: q, status,
    brand_id, product_type, is_featured, is_best_seller. category_ids is
    omitted from list rows (would be N+1); fetch a product's detail for its
    category assignment."""
    stmt = select(Product).options(selectinload(Product.translations), selectinload(Product.variants))

    if q and q.strip():
        # EXISTS rather than a JOIN: a product has one translation row per
        # locale and many variants, so joining would emit the same product
        # several times and break the (created_at, id) cursor. EXISTS keeps it
        # to one row per product with no DISTINCT.
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                select(ProductTranslation.id)
                .where(
                    ProductTranslation.product_id == Product.id,
                    ProductTranslation.name.ilike(pattern),
                )
                .exists(),
                select(Variant.id)
                .where(Variant.product_id == Product.id, Variant.sku.ilike(pattern))
                .exists(),
            )
        )

    if status_ is not None:
        stmt = stmt.where(Product.status == status_)
    if brand_id is not None:
        stmt = stmt.where(Product.brand_id == brand_id)
    if product_type is not None:
        stmt = stmt.where(Product.product_type == product_type)
    if is_featured is not None:
        stmt = stmt.where(Product.is_featured == is_featured)
    if is_best_seller is not None:
        stmt = stmt.where(Product.is_best_seller == is_best_seller)
    if is_on_offer is not None:
        offer_exists = (
            select(Variant.id)
            .where(
                Variant.product_id == Product.id,
                Variant.is_active.is_(True),
                Variant.compare_at_price.is_not(None),
                Variant.compare_at_price > func.coalesce(Variant.price, Product.base_price),
            )
            .exists()
        )
        stmt = stmt.where(offer_exists if is_on_offer else ~offer_exists)
    items, next_cursor = paginate(db, stmt, Product, cursor, limit)
    for p in items:
        p.category_ids = []
        p.is_on_offer = product_service.is_product_on_offer(p)
    # One query each for the whole page's stock column and thumbnails, rather
    # than one per row.
    product_service.attach_stock_totals(db, items)
    product_service.attach_primary_image_keys(db, items)
    return {"items": [ProductOut.model_validate(p) for p in items], "next_cursor": next_cursor}


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))) -> Product:
    return product_service.get_product(db, product_id)


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("catalog.manage")),
) -> Product:
    return product_service.update_product(db, product_id, payload, current_user.id)


@router.patch("/{product_id}/stock", response_model=ProductOut)
def set_product_stock(
    product_id: int,
    payload: ProductStockUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("stock.adjust")),
) -> Product:
    """Set every variant's stock quantity in one transaction — what the product
    form's stock column saves. Each quantity still lands as a stock movement,
    so the ledger stays the record of how the number got there."""
    return product_service.set_product_stock(db, product_id, payload.items, current_user.id)


@router.patch("/{product_id}/status", response_model=ProductOut)
def update_product_status(
    product_id: int,
    payload: ProductStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("product.publish")),
) -> Product:
    return product_service.update_product_status(db, product_id, payload.status, current_user.id)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("catalog.manage")),
) -> None:
    """Soft-delete the product so order history keeps its references."""
    product_service.delete_product(db, product_id, current_user.id)


@router.get("/{product_id}/media", response_model=list[ProductMediaItemOut])
def list_product_media(
    product_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))
) -> list[dict]:
    """The product's gallery, primary image first then by sort_order. Each
    entry inlines the media file so the admin can render it without a
    follow-up request per image."""
    return media_service.list_product_media(db, product_id)


# Permission keys used by this router: catalog.view, catalog.manage, product.publish
