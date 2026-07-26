from fastapi import APIRouter

from app.routers import (
    audit,
    auth,
    brands,
    categories,
    counts,
    customers,
    goods_receipts,
    inventory,
    locations,
    media,
    option_values,
    options,
    orders,
    products,
    purchase_orders,
    roles,
    settings,
    suppliers,
    transfers,
    users,
    variants,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(brands.router, prefix="/brands", tags=["brands"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(options.router, prefix="/options", tags=["options"])
api_router.include_router(option_values.router, prefix="/option-values", tags=["option-values"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(variants.router, tags=["variants"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])
api_router.include_router(inventory.router, tags=["inventory"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["transfers"])
api_router.include_router(counts.router, prefix="/counts", tags=["counts"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["purchase-orders"])
api_router.include_router(goods_receipts.router, prefix="/goods-receipts", tags=["goods-receipts"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])