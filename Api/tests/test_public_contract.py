from fastapi.testclient import TestClient
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.main import app
from app.middleware.error import NotFoundError
from app.services import shop_service
from app.services.shop_service import CatalogData, _cursor_encode, _cursor_id, locale_from_header


def test_error_envelope_always_contains_details():
    response = TestClient(app).get("/does-not-exist")
    assert response.status_code == 404
    assert response.json() == {
        "code": "http_error",
        "message": "Not Found",
        "details": None,
    }


def test_public_shop_routes_are_registered():
    paths = {route.path for route in app.routes}
    assert "/shop/v1/products" in paths
    assert "/shop/v1/products/{slug}" in paths
    assert "/shop/v1/collections/{code}" in paths
    assert "/shop/v1/categories/tree" in paths


def test_accept_language_resolution():
    assert locale_from_header("en-US,en;q=0.9") == "en"
    assert locale_from_header("ar-SA") == "ar"
    assert locale_from_header(None) == "ar"


def test_shop_cursor_round_trip_and_invalid_input():
    assert _cursor_id(_cursor_encode(42)) == 42
    assert _cursor_id("not-a-cursor") is None


def test_every_collection_links_to_its_own_listing_not_the_category_index(monkeypatch):
    """Regression: every collection used to return href="/c", so "view all" on
    the best sellers rail landed on the list of all categories."""
    from app.services import shop_service as service
    from app.services.shop_service import COLLECTION_CODES

    empty = CatalogData(
        products=[],
        brands={},
        product_media={},
        media={},
        product_categories={},
        variant_values={},
        option_values={},
        options={},
        availability={},
        product_attributes={},
        tracked={},
    )
    monkeypatch.setattr(service, "_load_catalog", lambda _db: empty)

    for code in COLLECTION_CODES:
        payload = service.collection(object(), code, "en", "http://test")
        assert payload["href"] == f"/collections/{code}"
        assert payload["code"] == code
        assert payload["title"]

    with pytest.raises(NotFoundError):
        service.collection(object(), "not_a_collection", "en", "http://test")


def test_collection_membership_is_one_rule_for_rail_and_listing(monkeypatch):
    """The rail and its "view all" page must agree on what is in a collection —
    they read the same predicate, so a product cannot appear in one and not the
    other."""
    from app.services import shop_service as service

    on_offer = SimpleNamespace(
        id=1,
        is_best_seller=False,
        is_featured=False,
        base_price=Decimal("100.00"),
        variants=[
            SimpleNamespace(
                is_active=True, price=Decimal("80.00"), compare_at_price=Decimal("120.00")
            )
        ],
    )
    plain = SimpleNamespace(
        id=2,
        is_best_seller=True,
        is_featured=False,
        base_price=Decimal("100.00"),
        variants=[SimpleNamespace(is_active=True, price=None, compare_at_price=None)],
    )

    assert service._in_collection(on_offer, "offers") is True
    assert service._in_collection(plain, "offers") is False
    assert service._in_collection(plain, "best_sellers") is True
    assert service._in_collection(on_offer, "best_sellers") is False
    # new_arrivals is an ordering, so nothing is excluded from it.
    assert service._in_collection(on_offer, "new_arrivals") is True
    assert service._in_collection(plain, "new_arrivals") is True


def test_product_list_cursor_returns_each_product_once(monkeypatch):
    now = datetime.now(timezone.utc)

    def product(product_id: int):
        variant = SimpleNamespace(
            id=product_id * 10,
            is_active=True,
            price=Decimal(f"{product_id}00.00"),
            compare_at_price=None,
            position=0,
            low_stock_threshold=None,
            sku=f"SKU-{product_id}",
        )
        return SimpleNamespace(
            id=product_id,
            brand_id=None,
            base_price=variant.price,
            is_best_seller=False,
            published_at=now,
            created_at=now,
            rating_avg=None,
            translations=[SimpleNamespace(locale="en", name=f"Product {product_id}", slug=f"p-{product_id}")],
            variants=[variant],
        )

    data = CatalogData(
        products=[product(1), product(2), product(3)],
        brands={},
        product_media={},
        media={},
        product_categories={},
        variant_values={},
        option_values={},
        options={},
        availability={},
        product_attributes={},
        tracked={1: True, 2: True, 3: True},
    )
    monkeypatch.setattr(shop_service, "_load_catalog", lambda _db: data)

    first = shop_service.product_list(object(), "en", "http://test", limit=2)
    second = shop_service.product_list(
        object(), "en", "http://test", limit=2, cursor=first["next_cursor"]
    )

    assert [item["id"] for item in first["items"]] == ["3", "2"]
    assert [item["id"] for item in second["items"]] == ["1"]
