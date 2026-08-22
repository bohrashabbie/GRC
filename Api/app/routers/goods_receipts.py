from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.purchasing import GoodsReceipt
from app.schemas.purchasing import GoodsReceiptCreate, GoodsReceiptOut
from app.services import purchasing_service

router = APIRouter()


@router.post("", response_model=GoodsReceiptOut, status_code=status.HTTP_201_CREATED)
def create_goods_receipt(
    payload: GoodsReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("goods_receipt.create")),
) -> GoodsReceipt:
    """Receives goods against a PO (partial receipt supported) or as an
    unplanned receipt. Writes stock through inventory_service only."""
    return purchasing_service.create_goods_receipt(db, payload, current_user.id)


@router.get("")
def list_goods_receipts(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    purchase_order_id: int | None = None,
    location_id: int | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("inventory.view")),
) -> dict:
    """Every receipt, newest first — what actually arrived, against which
    order, at which location."""
    items, next_cursor = purchasing_service.list_goods_receipts(
        db, cursor, limit, purchase_order_id=purchase_order_id, location_id=location_id
    )
    return {
        "items": [GoodsReceiptOut.model_validate(item) for item in items],
        "next_cursor": next_cursor,
    }


@router.get("/{receipt_id}", response_model=GoodsReceiptOut)
def get_goods_receipt(
    receipt_id: int, db: Session = Depends(get_db), _user=Depends(require("inventory.view"))
) -> GoodsReceipt:
    return purchasing_service.get_goods_receipt(db, receipt_id)


# Permission keys used by this router: goods_receipt.create, inventory.view
