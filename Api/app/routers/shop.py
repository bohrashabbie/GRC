from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, Header, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.middleware.error import AuthenticationError
from app.middleware.security import decode_customer_access_token
from app.models.customers import Customer
from app.schemas.shop import (
    CheckoutIn,
    CheckoutOut,
    CustomerOut,
    LoginIn,
    RegisterIn,
    SessionOut,
    StockCheckIn,
    VariantStockOut,
    WishlistOut,
)
from app.services import account_service, checkout_service, shop_service

router = APIRouter(tags=["shop"])

_customer_bearer = HTTPBearer(auto_error=False)


def get_current_customer(
    credentials: HTTPAuthorizationCredentials | None = Depends(_customer_bearer),
    db: Session = Depends(get_db),
) -> Customer:
    """Resolves a shopper from a customer-typed token.

    decode_customer_access_token refuses a staff token outright, so this can
    never hand back a Customer for someone holding admin credentials, and the
    admin's get_current_user refuses a customer token in the same way.
    """
    if credentials is None:
        raise AuthenticationError("Sign in to continue.", code="login_required")
    payload = decode_customer_access_token(credentials.credentials)
    return account_service.get_customer(db, int(payload["sub"]))


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


# --------------------------------------------------------------------------
# Customer accounts and wishlist
# --------------------------------------------------------------------------


@router.post("/account/register", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """Creates the account and signs the shopper straight in — making someone
    who just chose a password type it again immediately is friction with no
    security benefit."""
    customer, token = account_service.register(db, payload)
    return {"token": token, "customer": _customer_payload(customer)}


@router.post("/account/login", response_model=SessionOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    customer, token = account_service.login(db, payload.email, payload.password)
    return {"token": token, "customer": _customer_payload(customer)}


@router.get("/account/me", response_model=CustomerOut)
def me(customer: Customer = Depends(get_current_customer)):
    return _customer_payload(customer)


@router.get("/wishlist", response_model=WishlistOut)
def get_wishlist(
    customer: Customer = Depends(get_current_customer), db: Session = Depends(get_db)
):
    return {"product_ids": account_service.wishlist_product_ids(db, customer.id)}


@router.post("/wishlist/{product_id}", response_model=WishlistOut)
def add_to_wishlist(
    product_id: int,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    account_service.add_to_wishlist(db, customer.id, product_id)
    return {"product_ids": account_service.wishlist_product_ids(db, customer.id)}


@router.delete("/wishlist/{product_id}", response_model=WishlistOut)
def remove_from_wishlist(
    product_id: int,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    account_service.remove_from_wishlist(db, customer.id, product_id)
    return {"product_ids": account_service.wishlist_product_ids(db, customer.id)}


def _customer_payload(customer: Customer) -> dict:
    return {
        "id": customer.id,
        "email": customer.email,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "phone": customer.phone_e164,
    }
