"""Remove the seeded demo catalog, orders, inventory and purchasing rows so the
database can be reseeded as a real GR8 store.

Deliberately KEPT:
  users, roles, permissions, role_permissions, user_roles, user_sessions
      - wiping these would lock everyone out of the admin panel.
  locations, settings, regions, tax_rates, carriers
      - configuration, not demo content.
  audit_log
      - it is the compliance trail. Deleting audit history to tidy up is
        exactly the thing an audit log exists to prevent, so it stays.

Run:  .venv/Scripts/python.exe -m scripts.wipe_demo_data   (from Api/)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

# Child-before-parent so no FK is ever violated mid-transaction. Using explicit
# DELETEs rather than TRUNCATE ... CASCADE, because CASCADE would happily reach
# into the tables above that we intend to keep.
DELETE_ORDER = [
    # orders and everything hanging off them
    "order_status_history",
    "order_notes",
    "order_items",
    "order_addresses",
    "payment_refunds",
    "payments",
    "shipment_items",
    "shipments",
    "return_items",
    "returns",
    "orders",
    # customers
    "customer_addresses",
    "customers",
    # purchasing
    "goods_receipt_items",
    "goods_receipts",
    "purchase_order_items",
    "purchase_orders",
    "suppliers",
    # inventory movements and projections
    "stock_count_items",
    "stock_counts",
    "stock_transfer_items",
    "stock_transfers",
    "stock_movements",
    "stock_levels",
    # catalog
    "variant_media",
    "variant_option_values",
    "variants",
    "product_media",
    "product_categories",
    "product_attributes",
    "product_translations",
    "products",
    "option_value_translations",
    "option_values",
    "option_translations",
    "options",
    "attribute_translations",
    "attributes",
    "category_translations",
    "categories",
    "brand_translations",
    "brands",
    "media",
]

# products.default_variant_id and variants.product_id reference each other, so
# neither table can be deleted first. Breaking the cycle by nulling the
# products side is the only way through.
PRE_STEPS = [
    "UPDATE products SET default_variant_id = NULL WHERE default_variant_id IS NOT NULL",
]

# Sequences to restart so the fresh catalog starts at id 1 instead of
# continuing from the demo rows' ids.
RESET_SEQUENCES = [
    "brands",
    "categories",
    "options",
    "option_values",
    "products",
    "variants",
    "media",
    "orders",
    "customers",
    "suppliers",
    "purchase_orders",
    "stock_transfers",
    "stock_counts",
]


def main() -> int:
    env = Path(__file__).resolve().parent.parent / ".env"
    url = re.search(r"DATABASE_URL=(.+)", env.read_text()).group(1).strip()
    engine = create_engine(url)

    with engine.begin() as conn:
        print(f"Connected to {url.rsplit('@', 1)[-1]}\n")
        for statement in PRE_STEPS:
            result = conn.execute(text(statement))
            print(f"  pre     {result.rowcount:>5}  {statement.split(' SET ')[0]}")
        total = 0
        for table in DELETE_ORDER:
            exists = conn.execute(
                text(
                    "SELECT 1 FROM information_schema.tables "
                    "WHERE table_schema='public' AND table_name=:t"
                ),
                {"t": table},
            ).scalar()
            if not exists:
                print(f"  skip    {table} (no such table)")
                continue
            before = conn.execute(text(f'SELECT count(*) FROM "{table}"')).scalar()
            if before:
                conn.execute(text(f'DELETE FROM "{table}"'))
                total += before
                print(f"  deleted {before:>5}  {table}")

        for table in RESET_SEQUENCES:
            seq = conn.execute(
                text("SELECT pg_get_serial_sequence(:t, 'id')"), {"t": table}
            ).scalar()
            if seq:
                conn.execute(text(f"ALTER SEQUENCE {seq} RESTART WITH 1"))

        print(f"\n{total} rows deleted, {len(RESET_SEQUENCES)} sequences reset.")

    with engine.connect() as conn:
        print("\nKept:")
        for table in ("users", "roles", "permissions", "user_roles", "locations", "settings", "audit_log"):
            n = conn.execute(text(f'SELECT count(*) FROM "{table}"')).scalar()
            print(f"  {table:<16} {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
