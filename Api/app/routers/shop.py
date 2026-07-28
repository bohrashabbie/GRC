from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.schemas.shop import CheckoutIn, CheckoutOut, StockCheckIn, VariantStockOut
from app.services import checkout_service, shop_service

router = APIRouter(tags=["shop"])


def _context(request: Request, accept_language: str | None) -> tuple[str, str]:
    base_url = settings.public_media_base_url or str(request.base_url).rstrip("/")
    return shop_service.locale_from_header(accept_language), base_url.rstrip("/")


@router.get("/categories/tree")
def category_tree(request: Request, accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    locale, base_url = _context(request, accept_language)
    return shop_service.category_tree(db, locale, base_url)


@router.get("/categories/{slug}/path")
def category_path(slug: str, request: Request, accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    locale, base_url = _context(request, accept_language)
    return shop_service.category_path(db, slug, locale, base_url)


@router.get("/categories/{slug}")
def category(slug: str, request: Request, accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    locale, base_url = _context(request, accept_language)
    return shop_service.category_by_slug(db, slug, locale, base_url)


@router.get("/products/slugs")
def product_slugs(accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    return shop_service.product_slugs(db, shop_service.locale_from_header(accept_language))


@router.get("/products")
def products(
    request: Request,
    category: str | None = None,
    q: str | None = None,
    colour: str | None = None,
    size: str | None = None,
    season: str | None = None,
    min_price: Decimal | None = Query(None, ge=0),
    max_price: Decimal | None = Query(None, ge=0),
    sort: str | None = None,
    collection: str | None = Query(
        None, description="best_sellers | new_arrivals | offers | featured"
    ),
    cursor: str | None = None,
    limit: int = Query(24, ge=1, le=100),
    accept_language: str | None = Header(None),
    db: Session = Depends(get_db),
):
    locale, base_url = _context(request, accept_language)
    return shop_service.product_list(
        db,
        locale,
        base_url,
        category=category,
        q=q,
        colour=colour,
        size=size,
        season=season,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        collection=collection,
        cursor=cursor,
        limit=limit,
    )


@router.get("/products/{slug}/related")
def related_products(slug: str, request: Request, accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    locale, base_url = _context(request, accept_language)
    return shop_service.related_products(db, slug, locale, base_url)


@router.get("/products/{slug}/reviews")
def reviews(slug: str):
    return {
        "items": [],
        "next_cursor": None,
        "summary": {"average": 0, "count": 0, "distribution": {str(value): 0 for value in range(1, 6)}},
    }


@router.get("/products/{slug}")
def product(slug: str, request: Request, accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    locale, base_url = _context(request, accept_language)
    return shop_service.product_detail(db, slug, locale, base_url)


@router.get("/collections/{code}")
def collection(code: str, request: Request, accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    locale, base_url = _context(request, accept_language)
    return shop_service.collection(db, code, locale, base_url)


@router.post("/stock/check", response_model=list[VariantStockOut])
def check_stock(payload: StockCheckIn, db: Session = Depends(get_db)) -> list[dict]:
    """Live quantities for the cart to clamp its steppers against. Advisory
    only — the authoritative check is the conditional decrement inside
    POST /checkout, which is what actually stops an oversell."""
    return shop_service.variant_stock(db, payload.variant_ids)


@router.post("/checkout", response_model=CheckoutOut, status_code=status.HTTP_201_CREATED)
def checkout(
    payload: CheckoutIn,
    accept_language: str | None = Header(None),
    db: Session = Depends(get_db),
):
    """Create the order and take its stock in one transaction.

    Returns 409 with code=insufficient_stock and details.available when a line
    cannot be filled, so the cart can say "only N left" and correct itself
    rather than failing blankly. No order is created in that case.
    """
    order = checkout_service.create_order(
        db, payload, locale=shop_service.locale_from_header(accept_language)
    )
    return {
        "order_number": order.order_number,
        "status": order.status,
        "payment_status": order.payment_status,
        "email": order.email,
        "totals": {
            "subtotal": order.subtotal,
            "discount_total": order.discount_total,
            "shipping_total": order.shipping_total,
            "tax_total": order.tax_total,
            "grand_total": order.grand_total,
        },
    }


@router.get("/stores")
def stores(accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    return shop_service.stores(db, shop_service.locale_from_header(accept_language))


@router.get("/regions")
def regions(accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    """Kuwait's governorates. Ids are slugs shared with /cities."""
    return shop_service.regions(db, shop_service.locale_from_header(accept_language))


@router.get("/cities")
def cities(
    region_id: str | None = Query(None, description="Governorate slug from /regions"),
    accept_language: str | None = Header(None),
    db: Session = Depends(get_db),
):
    """Areas, optionally within one governorate."""
    return shop_service.cities(
        db, shop_service.locale_from_header(accept_language), region_id
    )


@router.get("/banners")
def banners(
    placement: str = Query(..., description="home_hero | home_promo | category_top | checkout_strip"),
    request: Request = None,
    accept_language: str | None = Header(None),
    db: Session = Depends(get_db),
):
    locale, base_url = _context(request, accept_language)
    return shop_service.banners(db, placement, locale, base_url)


@router.get("/menus/{code}")
def menu(code: str, accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    return shop_service.menu(db, code, shop_service.locale_from_header(accept_language))


@router.get("/pages/slugs")
def page_slugs(accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    return shop_service.page_slugs(db, shop_service.locale_from_header(accept_language))


@router.get("/pages/{slug}")
def page(slug: str, accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    return shop_service.page(db, slug, shop_service.locale_from_header(accept_language))
