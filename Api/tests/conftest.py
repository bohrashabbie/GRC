"""Fixtures for the integration tests that need a real database.

The stock guarantees under test are properties of Postgres row locking, not of
Python: a fake session cannot demonstrate that two concurrent transactions
racing for the last unit produce exactly one winner. So these run against the
same local database the app uses, creating uniquely-named rows and deleting
them afterwards rather than truncating anything.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import text

from app.database import SessionLocal
from app.models.catalog import Product, ProductTranslation, Variant
from app.models.inventory import Location, StockLevel


@pytest.fixture(scope="session")
def db_available() -> bool:
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return True
    except Exception:  # pragma: no cover - environment-dependent
        pytest.skip("No database reachable; skipping integration tests.")


@pytest.fixture
def session(db_available):
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def online_location(session):
    """Reuse the app's own choice of default location rather than making a new
    one, so the tests exercise the same row the running app would write."""
    from app.services import inventory_service

    location_id = inventory_service.ensure_default_online_location(session)
    session.commit()
    return session.get(Location, location_id)


class Factory:
    """Creates throwaway catalog rows and remembers them for cleanup.

    Everything is committed rather than held in an open transaction, because
    the concurrency test needs a second connection to be able to see it.
    """

    def __init__(self, session, location):
        self.session = session
        self.location = location
        self.product_ids: list[int] = []

    def product(
        self,
        *,
        stock: int | dict[str, int] = 0,
        track_inventory: bool = True,
        low_stock_threshold: int | None = None,
        variants: int = 1,
        price: str = "100.00",
    ) -> Product:
        tag = uuid.uuid4().hex[:8]
        product = Product(
            product_type="thobe",
            status="active",
            base_price=price,
            tax_class="standard",
            track_inventory=track_inventory,
            rating_count=0,
            published_at=datetime.now(timezone.utc),
        )
        self.session.add(product)
        self.session.flush()

        for locale in ("ar", "en"):
            self.session.add(
                ProductTranslation(
                    product_id=product.id,
                    locale=locale,
                    name=f"Test thobe {tag}",
                    slug=f"test-thobe-{tag}-{locale}",
                )
            )

        quantities = stock if isinstance(stock, dict) else None
        for index in range(variants):
            variant = Variant(
                product_id=product.id,
                sku=f"TEST-{tag}-{index}",
                position=index,
                is_active=True,
                low_stock_threshold=low_stock_threshold,
            )
            self.session.add(variant)
            self.session.flush()
            if product.default_variant_id is None:
                product.default_variant_id = variant.id

            quantity = quantities[str(index)] if quantities else stock
            self.session.add(
                StockLevel(
                    variant_id=variant.id,
                    location_id=self.location.id,
                    on_hand=quantity,
                    reserved=0,
                    incoming=0,
                    safety_stock=0,
                    updated_at=datetime.now(timezone.utc),
                )
            )

        self.session.commit()
        self.session.refresh(product)
        self.product_ids.append(product.id)
        return product

    def cleanup(self) -> None:
        if not self.product_ids:
            return
        # Raw SQL in dependency order: order_items and stock_movements have no
        # cascade back to the product, and leaving them behind would break the
        # FKs on the variants being removed.
        self.session.rollback()
        self.session.execute(
            text(
                """
                DELETE FROM stock_movements WHERE variant_id IN (
                    SELECT id FROM variants WHERE product_id = ANY(:ids)
                );
                """
            ),
            {"ids": self.product_ids},
        )
        order_ids = list(
            self.session.execute(
                text(
                    "SELECT DISTINCT order_id FROM order_items WHERE product_id = ANY(:ids)"
                ),
                {"ids": self.product_ids},
            ).scalars()
        )
        if order_ids:
            for table in (
                "payment_refunds",
                "payments",
                "order_items",
                "order_addresses",
                "order_notes",
                "order_status_history",
            ):
                self.session.execute(
                    text(f"DELETE FROM {table} WHERE order_id = ANY(:ids)"),
                    {"ids": order_ids},
                )
            self.session.execute(
                text("DELETE FROM audit_log WHERE entity_type = 'order' AND entity_id = ANY(:ids)"),
                {"ids": order_ids},
            )
            self.session.execute(
                text("DELETE FROM orders WHERE id = ANY(:ids)"), {"ids": order_ids}
            )
        self.session.execute(
            text(
                "DELETE FROM stock_levels WHERE variant_id IN "
                "(SELECT id FROM variants WHERE product_id = ANY(:ids))"
            ),
            {"ids": self.product_ids},
        )
        self.session.execute(
            text("UPDATE products SET default_variant_id = NULL WHERE id = ANY(:ids)"),
            {"ids": self.product_ids},
        )
        self.session.execute(
            text("DELETE FROM variants WHERE product_id = ANY(:ids)"), {"ids": self.product_ids}
        )
        self.session.execute(
            text("DELETE FROM product_translations WHERE product_id = ANY(:ids)"),
            {"ids": self.product_ids},
        )
        self.session.execute(
            text("DELETE FROM audit_log WHERE entity_type = 'product' AND entity_id = ANY(:ids)"),
            {"ids": self.product_ids},
        )
        self.session.execute(
            text("DELETE FROM products WHERE id = ANY(:ids)"), {"ids": self.product_ids}
        )
        self.session.commit()


@pytest.fixture
def factory(session, online_location):
    made = Factory(session, online_location)
    try:
        yield made
    finally:
        made.cleanup()
