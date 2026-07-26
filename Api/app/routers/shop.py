from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.services import shop_service

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


@router.get("/stores")
def stores(accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    return shop_service.stores(db, shop_service.locale_from_header(accept_language))


@router.get("/regions")
def regions(accept_language: str | None = Header(None), db: Session = Depends(get_db)):
    return shop_service.regions(db, shop_service.locale_from_header(accept_language))
