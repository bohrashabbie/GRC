"""Every permission key the admin panel understands, and the 8 default roles.

Routers must reference permission keys defined here via require("some.key") —
never invent a key inline. deps.require() validates against this list at
import time so a typo fails fast instead of silently granting nothing.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PermissionDef:
    key: str
    group: str
    description: str
    is_dangerous: bool = False


PERMISSIONS: list[PermissionDef] = [
    # system / staff auth & RBAC
    PermissionDef("user.view", "system", "View staff accounts"),
    PermissionDef("user.create", "system", "Create staff accounts"),
    PermissionDef("user.update", "system", "Edit staff accounts, activate/deactivate"),
    PermissionDef("user.assign_role", "system", "Assign or revoke roles for a staff account", is_dangerous=True),
    PermissionDef("role.view", "system", "View roles and their permissions"),
    PermissionDef("role.manage_permissions", "system", "Change which permissions a role grants", is_dangerous=True),
    PermissionDef("audit.view", "system", "View the audit log"),
    PermissionDef("settings.view", "system", "View store settings"),
    PermissionDef("settings.update", "system", "Change store settings", is_dangerous=True),
    # catalog
    PermissionDef("catalog.view", "catalog", "View brands, categories, products, options"),
    PermissionDef("catalog.manage", "catalog", "Create/edit brands, categories, products, options"),
    PermissionDef("product.publish", "catalog", "Change a product's status to active/archived"),
    PermissionDef("media.upload", "catalog", "Upload media files"),
    PermissionDef("variant.price_edit", "catalog", "Edit variant price, compare-at price, cost price", is_dangerous=True),
    # inventory & purchasing
    PermissionDef("inventory.view", "inventory", "View stock levels and movements"),
    PermissionDef("stock.adjust", "inventory", "Set a variant's stock on the product form", is_dangerous=True),
    PermissionDef("location.manage", "inventory", "Create/edit locations"),
    PermissionDef("supplier.manage", "inventory", "Create/edit suppliers"),
    PermissionDef("purchase_order.manage", "inventory", "Create/edit/approve purchase orders"),
    PermissionDef("goods_receipt.create", "inventory", "Record goods receipts against a PO"),
    # orders
    PermissionDef("order.view", "orders", "View orders"),
    PermissionDef("order.update_status", "orders", "Transition order/payment/fulfilment status"),
    PermissionDef("order.note", "orders", "Add notes to an order"),
    PermissionDef("order.refund", "orders", "Issue a refund against a payment", is_dangerous=True),
    PermissionDef("shipment.manage", "orders", "Create shipments and update tracking"),
    PermissionDef("return.manage", "orders", "Approve/process returns and exchanges"),
    # customers
    PermissionDef("customer.view", "customers", "View customer accounts and addresses"),
    PermissionDef("customer.update", "customers", "Edit customer accounts and addresses"),
    # marketing
    PermissionDef("marketing.view", "marketing", "View marketing configuration"),
    # cms — banners, menus, static pages
    PermissionDef("cms.view", "marketing", "View banners, menus and static pages"),
    PermissionDef("cms.banner.manage", "marketing", "Create/edit/remove home and category banners"),
    PermissionDef("cms.menu.manage", "marketing", "Edit navigation menu item labels (menus and items are fixed, not staff-created)"),
    PermissionDef("cms.page.manage", "marketing", "Edit static page text (pages are fixed, not staff-created)"),
    PermissionDef("cms.page.publish", "marketing", "Publish or unpublish a static page"),
    # finance
    PermissionDef("finance.view", "finance", "View financial reports and exports"),
    # analytics
    PermissionDef("analytics.view", "analytics", "View dashboard analytics (revenue, orders, top products, stock)"),
]

DEFAULT_ROLES: list[dict] = [
    {
        "code": "owner",
        "name_ar": "المالك",
        "name_en": "Owner",
        "description": "Full access to everything. Cannot be deleted.",
        "is_system": True,
    },
    {
        "code": "admin",
        "name_ar": "مدير النظام",
        "name_en": "Admin",
        "description": "Full operational access, excluding role/permission management.",
        "is_system": True,
    },
    {
        "code": "catalog_manager",
        "name_ar": "مدير الكتالوج",
        "name_en": "Catalog Manager",
        "description": "Manages brands, categories, products, and media.",
        "is_system": False,
    },
    {
        "code": "inventory_clerk",
        "name_ar": "موظف المخزون",
        "name_en": "Inventory Clerk",
        "description": "Manages stock levels, transfers, counts, and purchasing.",
        "is_system": False,
    },
    {
        "code": "order_processor",
        "name_ar": "معالج الطلبات",
        "name_en": "Order Processor",
        "description": "Processes orders, shipments, and returns.",
        "is_system": False,
    },
    {
        "code": "support",
        "name_ar": "الدعم الفني",
        "name_en": "Support",
        "description": "Views orders and customers, adds notes.",
        "is_system": False,
    },
    {
        "code": "marketing",
        "name_ar": "التسويق",
        "name_en": "Marketing",
        "description": "Manages marketing-facing configuration.",
        "is_system": False,
    },
    {
        "code": "accountant",
        "name_ar": "محاسب",
        "name_en": "Accountant",
        "description": "Views financial reports and orders; no catalog or stock edit access.",
        "is_system": False,
    },
]

_ALL_KEYS = [p.key for p in PERMISSIONS]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "owner": _ALL_KEYS,
    "admin": [k for k in _ALL_KEYS if k not in {"role.manage_permissions", "user.assign_role"}],
    "catalog_manager": [
        "catalog.view",
        "catalog.manage",
        "product.publish",
        "media.upload",
        "variant.price_edit",
        "inventory.view",
    ],
    "inventory_clerk": [
        "inventory.view",
        "stock.adjust",
        "location.manage",
        "supplier.manage",
        "purchase_order.manage",
        "goods_receipt.create",
        "catalog.view",
    ],
    "order_processor": [
        "order.view",
        "order.update_status",
        "order.note",
        "shipment.manage",
        "return.manage",
        "customer.view",
        "inventory.view",
        "analytics.view",
    ],
    "support": ["order.view", "order.note", "customer.view", "customer.update"],
    "marketing": [
        "marketing.view",
        "catalog.view",
        "customer.view",
        "cms.view",
        "cms.banner.manage",
        "cms.menu.manage",
        "cms.page.manage",
        "cms.page.publish",
    ],
    "accountant": ["finance.view", "order.view", "audit.view", "settings.view", "analytics.view"],
}


def all_permission_keys() -> set[str]:
    return set(_ALL_KEYS)
