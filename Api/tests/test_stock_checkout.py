"""The four guarantees the stock design exists to provide.

These run against the real database on purpose. Every one of them is a claim
about transaction behaviour — row locking, atomic rollback, an idempotency
stamp — and none of them can be demonstrated against a fake session.
"""

from __future__ import annotations

import threading
from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.database import SessionLocal
from app.middleware.error import ConflictError
from app.models.catalog import Variant
from app.models.inventory import StockLevel
from app.models.orders import Order
from app.services import checkout_service, inventory_service, order_service


def _checkout(lines: list[tuple[int, int]]):
    """A minimal valid CheckoutIn-shaped payload. Built as a namespace rather
    than the Pydantic model so a test can express a quantity the schema would
    reject if we ever needed to."""
    return SimpleNamespace(
        lines=[SimpleNamespace(variant_id=variant_id, quantity=qty) for variant_id, qty in lines],
        email="shopper@example.com",
        shipping_address=SimpleNamespace(
            full_name="Abdullah Al Mutairi",
            phone="+96551234567",
            governorate_id="hawalli",
            area_id="salmiya",
            block="10",
            street="1",
            building="24",
            extra_directions="Second floor, flat 5",
        ),
        shipping_method_id="standard",
        # Cash on delivery is the only method checkout_service accepts while
        # there is no gateway; see ENABLED_PAYMENT_METHODS.
        payment_method_code="cod",
    )


def _on_hand(session, variant_id: int) -> int:
    session.expire_all()
    return session.execute(
        select(StockLevel.on_hand).where(StockLevel.variant_id == variant_id)
    ).scalar_one()


def test_two_concurrent_orders_for_the_last_unit_leave_exactly_one_winner(factory, session):
    """The core race. Both transactions see stock of 1 when they start; the
    conditional UPDATE's WHERE clause is what makes only one of them take it."""
    product = factory.product(stock=1)
    variant_id = product.variants[0].id

    start = threading.Barrier(2)
    results: list[str] = []
    lock = threading.Lock()

    def place() -> None:
        db = SessionLocal()
        try:
            start.wait(timeout=10)
            checkout_service.create_order(db, _checkout([(variant_id, 1)]))
            outcome = "ok"
        except ConflictError as exc:
            db.rollback()
            outcome = exc.code
        except Exception as exc:  # pragma: no cover - surfaces real breakage
            db.rollback()
            outcome = f"error:{exc!r}"
        finally:
            db.close()
        with lock:
            results.append(outcome)

    threads = [threading.Thread(target=place) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)

    assert sorted(results) == ["insufficient_stock", "ok"], results
    assert _on_hand(session, variant_id) == 0

    orders = session.execute(
        select(Order).join(Order.items).where(Order.items.any(variant_id=variant_id))
    ).unique().scalars().all()
    assert len(orders) == 1, "the losing transaction must not have left an order behind"


def test_a_failing_line_rolls_back_the_whole_order(factory, session):
    """Three lines, the middle one short. Nothing is decremented — not even the
    first line, which had already succeeded when the second one failed — and no
    order row survives."""
    product = factory.product(stock={"0": 5, "1": 0, "2": 5}, variants=3)
    first, second, third = [v.id for v in sorted(product.variants, key=lambda v: v.position)]

    with pytest.raises(ConflictError) as exc:
        checkout_service.create_order(
            session, _checkout([(first, 2), (second, 1), (third, 2)])
        )

    assert exc.value.code == "insufficient_stock"
    assert exc.value.details["variant_id"] == second
    assert exc.value.details["available"] == 0
    session.rollback()

    assert _on_hand(session, first) == 5
    assert _on_hand(session, second) == 0
    assert _on_hand(session, third) == 5

    placed = session.execute(
        select(Order).where(Order.items.any(product_id=product.id))
    ).unique().scalars().all()
    assert placed == []


def test_cancelling_twice_restores_stock_only_once(factory, session):
    """Both guards are exercised: the status transition table refuses the second
    cancel, and stock_restored_at refuses the restock even if it did not."""
    product = factory.product(stock=10)
    variant_id = product.variants[0].id

    order = checkout_service.create_order(session, _checkout([(variant_id, 3)]))
    assert _on_hand(session, variant_id) == 7

    order_service.update_order_status(
        session, order.id, "status", "cancelled", "Customer changed their mind", actor_user_id=None
    )
    assert _on_hand(session, variant_id) == 10

    # cancelled is terminal, so the second attempt is rejected outright.
    with pytest.raises(Exception) as exc:
        order_service.update_order_status(
            session, order.id, "status", "cancelled", "Double click", actor_user_id=None
        )
    assert getattr(exc.value, "code", None) == "invalid_status_transition"
    session.rollback()
    assert _on_hand(session, variant_id) == 10

    # And the underlying restock is itself idempotent, independently of the
    # transition table — this is what protects the refund path.
    reloaded = order_service.get_order(session, order.id)
    assert order_service._restore_stock_once(session, reloaded) is False
    session.commit()
    assert _on_hand(session, variant_id) == 10


def test_only_cash_on_delivery_can_complete_a_checkout(factory, session):
    """No gateway exists, so a card method must be refused outright rather than
    recording an order against a payment nobody ever attempted."""
    from app.middleware.error import BusinessRuleError

    product = factory.product(stock=5)
    variant_id = product.variants[0].id

    for method in ("mada", "card", "apple_pay", "tamara"):
        payload = _checkout([(variant_id, 1)])
        payload.payment_method_code = method
        with pytest.raises(BusinessRuleError) as exc:
            checkout_service.create_order(session, payload)
        assert exc.value.code == "payment_method_unavailable"
        session.rollback()

    # And nothing was taken for any of those refusals.
    assert _on_hand(session, variant_id) == 5

    order = checkout_service.create_order(session, _checkout([(variant_id, 1)]))
    assert order.status == "pending"
    assert _on_hand(session, variant_id) == 4


def test_untracked_product_sells_at_zero_and_leaves_the_number_alone(factory, session):
    """track_inventory = false: purchasable at zero stock, and the recorded
    quantity is untouched rather than driven negative."""
    product = factory.product(stock=0, track_inventory=False)
    variant_id = product.variants[0].id

    order = checkout_service.create_order(session, _checkout([(variant_id, 4)]))

    assert order.order_number.startswith("GRC-")
    assert _on_hand(session, variant_id) == 0

    movements = session.execute(
        select(StockLevel).where(StockLevel.variant_id == variant_id)
    ).scalars().all()
    assert len(movements) == 1

    # And nothing was written to the ledger for it either.
    from app.models.inventory import StockMovement

    ledger = session.execute(
        select(StockMovement).where(StockMovement.variant_id == variant_id)
    ).scalars().all()
    assert ledger == []


def test_set_stock_writes_a_movement_and_is_a_no_op_when_unchanged(factory, session):
    """The admin product form's only write path. The ledger stays complete
    (Hard Rule 2), and re-saving an unchanged number adds no noise to it."""
    from app.models.inventory import StockMovement

    product = factory.product(stock=0)
    variant_id = product.variants[0].id

    inventory_service.set_stock(session, variant_id, 25, actor_user_id=None)
    session.commit()
    assert _on_hand(session, variant_id) == 25

    ledger = session.execute(
        select(StockMovement).where(StockMovement.variant_id == variant_id)
    ).scalars().all()
    assert [m.qty_delta for m in ledger] == [25]
    assert ledger[0].balance_after == 25

    inventory_service.set_stock(session, variant_id, 25, actor_user_id=None)
    session.commit()
    ledger = session.execute(
        select(StockMovement).where(StockMovement.variant_id == variant_id)
    ).scalars().all()
    assert len(ledger) == 1, "re-saving the same number should not write a movement"


def test_variant_read_carries_the_stock_number(factory, session):
    product = factory.product(stock=7)
    variant_id = product.variants[0].id

    variant = session.get(Variant, variant_id)
    inventory_service_map = inventory_service.stock_map(session, [variant_id])
    assert inventory_service_map[variant_id] == 7
    assert inventory_service.stock_state(7, None, True) == "in_stock"
    assert inventory_service.stock_state(7, 10, True) == "low_stock"
    assert inventory_service.stock_state(0, None, True) == "out_of_stock"
    assert inventory_service.stock_state(0, None, False) == "in_stock"
    assert variant.sku.startswith("TEST-")
