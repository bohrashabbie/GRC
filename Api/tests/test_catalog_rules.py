from decimal import Decimal
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.middleware.error import BusinessRuleError
from app.schemas.catalog import ProductStatusUpdate, ProductUpdate, VariantPriceUpdate
from app.services import audit_service, product_service, variant_service


class FakeSession:
    def __init__(self, *, variant=None, product=None, category_rows=None):
        self.variant = variant
        self.product = product
        self.category_rows = category_rows or []
        self.added = []
        self.deleted = []

    def get(self, model, object_id, **_kwargs):
        if model.__name__ == "Variant":
            return self.variant
        if model.__name__ == "Product":
            return self.product
        return None

    def add(self, value):
        self.added.append(value)

    def delete(self, value):
        self.deleted.append(value)

    def commit(self):
        pass

    def refresh(self, _value):
        pass

    def execute(self, *_args, **_kwargs):
        """Enough of a Result for the stock lookups that ride along on variant
        reads. No online location means every quantity resolves to 0, which is
        the right answer for a session that has no rows at all."""
        return SimpleNamespace(
            scalar_one_or_none=lambda: None,
            scalar_one=lambda: None,
            all=lambda: [],
            first=lambda: None,
        )

    def query(self, _model):
        return self

    def filter(self, *_args):
        return self

    def __iter__(self):
        return iter(self.category_rows)


def test_product_status_rejects_unknown_value():
    with pytest.raises(ValidationError):
        ProductStatusUpdate(status="nonsense")


def test_price_schema_rejects_inverted_offer():
    with pytest.raises(ValidationError):
        VariantPriceUpdate(price="200.00", compare_at_price="100.00")


def test_variant_price_update_can_clear_nullable_prices(monkeypatch):
    variant = SimpleNamespace(
        id=10,
        product_id=20,
        price=Decimal("100.00"),
        compare_at_price=Decimal("130.00"),
        cost_price=Decimal("60.00"),
    )
    product = SimpleNamespace(base_price=Decimal("110.00"))
    db = FakeSession(variant=variant, product=product)
    monkeypatch.setattr(variant_service, "get_variant_option_value_ids", lambda *_args: [])
    monkeypatch.setattr(audit_service, "record", lambda *_args, **_kwargs: None)

    result = variant_service.update_variant_price(
        db,
        variant.id,
        VariantPriceUpdate(price=None, compare_at_price=None, cost_price=None),
        actor_user_id=1,
    )

    assert result.price is None
    assert result.compare_at_price is None
    assert result.cost_price is None


def test_variant_price_update_validates_against_effective_existing_price(monkeypatch):
    variant = SimpleNamespace(
        id=10,
        product_id=20,
        price=Decimal("100.00"),
        compare_at_price=None,
        cost_price=None,
    )
    db = FakeSession(variant=variant, product=SimpleNamespace(base_price=Decimal("90.00")))

    with pytest.raises(BusinessRuleError) as exc:
        variant_service.update_variant_price(
            db,
            variant.id,
            VariantPriceUpdate(compare_at_price="80.00"),
            actor_user_id=1,
        )
    assert exc.value.code == "invalid_compare_at_price"


def test_product_brand_can_be_cleared(monkeypatch):
    product = SimpleNamespace(
        id=1,
        brand_id=9,
        product_type="thobe",
        base_price=Decimal("100.00"),
        tax_class="standard",
        is_featured=False,
        is_best_seller=False,
        translations=[],
        variants=[],
    )
    db = FakeSession(product=product)
    monkeypatch.setattr(product_service, "_load", lambda *_args: product)
    monkeypatch.setattr(product_service, "get_product_category_ids", lambda *_args: [])
    monkeypatch.setattr(audit_service, "record", lambda *_args, **_kwargs: None)

    result = product_service.update_product(db, product.id, ProductUpdate(brand_id=None), 1)

    assert result.brand_id is None


def test_delete_product_marks_deleted_without_hard_deleting(monkeypatch):
    product = SimpleNamespace(
        id=1,
        status="active",
        is_featured=True,
        is_best_seller=True,
    )
    db = FakeSession(product=product)
    audit_calls = []
    monkeypatch.setattr(product_service, "_load", lambda *_args: product)
    monkeypatch.setattr(
        audit_service,
        "record",
        lambda *_args, **kwargs: audit_calls.append(kwargs),
    )

    product_service.delete_product(db, product.id, actor_user_id=7)

    assert product.status == "deleted"
    assert product.is_featured is False
    assert product.is_best_seller is False
    assert db.deleted == []
    assert audit_calls == [
        {
            "actor_user_id": 7,
            "action": "product.delete",
            "entity_type": "product",
            "entity_id": 1,
            "before": {
                "status": "active",
                "is_featured": True,
                "is_best_seller": True,
            },
            "after": {
                "status": "deleted",
                "is_featured": False,
                "is_best_seller": False,
            },
        }
    ]


def test_category_sync_reassigns_primary_and_sort_order():
    first = SimpleNamespace(product_id=1, category_id=11, is_primary=True, sort_order=0)
    second = SimpleNamespace(product_id=1, category_id=12, is_primary=False, sort_order=1)
    db = FakeSession(category_rows=[first, second])

    product_service._sync_categories(db, 1, [12])

    assert second.is_primary is True
    assert second.sort_order == 0
    assert first in db.deleted


def test_decimal_audit_values_remain_exact_strings():
    before, after = audit_service.diff_changed_fields(
        SimpleNamespace(price=Decimal("99.90")),
        {"price": Decimal("89.90")},
    )
    assert before == {"price": "99.90"}
    assert after == {"price": "89.90"}
