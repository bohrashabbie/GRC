from __future__ import annotations

from fastapi import APIRouter, Depends, status
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


@router.get("/{receipt_id}", response_model=GoodsReceiptOut)
def get_goods_receipt(
    receipt_id: int, db: Session = Depends(get_db), _user=Depends(require("inventory.view"))
) -> GoodsReceipt:
    return purchasing_service.get_goods_receipt(db, receipt_id)


# Permission keys used by this router: goods_receipt.create, inventory.view
