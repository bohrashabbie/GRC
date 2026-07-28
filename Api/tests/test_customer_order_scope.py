from sqlalchemy import select
from sqlalchemy.dialects import postgresql

from app.models.orders import Order
from app.services import order_service


def test_customer_order_scope_includes_only_linked_or_unlinked_email_matches():
    statement = select(Order).where(order_service.customer_order_scope(42))
    compiled = statement.compile(dialect=postgresql.dialect())
    sql = str(compiled)

    assert "orders.customer_id =" in sql
    assert "orders.customer_id IS NULL" in sql
    assert "orders.email =" in sql
    assert "customers.email" in sql
    assert 42 in compiled.params.values()
