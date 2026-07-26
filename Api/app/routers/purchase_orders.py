from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.purchasing import PurchaseOrder
from app.schemas.purchasing import PurchaseOrderCreate, PurchaseOrderOut
from app.services import purchasing_service

router = APIRouter()


@router.post("", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("purchase_order.manage")),
) -> PurchaseOrder:
    return purchasing_service.create_purchase_order(db, payload, current_user.id)


@router.get("/{po_id}", response_model=PurchaseOrderOut)
def get_purchase_order(
    po_id: int, db: Session = Depends(get_db), _user=Depends(require("inventory.view"))
) -> PurchaseOrder:
    return purchasing_service.get_purchase_order(db, po_id)


@router.post("/{po_id}/approve", response_model=PurchaseOrderOut)
def approve_purchase_order(
    po_id: int, db: Session = Depends(get_db), current_user: User = Depends(require("purchase_order.manage"))
) -> PurchaseOrder:
    """Requires a different user than the one who created the PO (separation of duties)."""
    return purchasing_service.approve_purchase_order(db, po_id, current_user.id)


@router.post("/{po_id}/send", response_model=PurchaseOrderOut)
def send_purchase_order(
    po_id: int, db: Session = Depends(get_db), _user=Depends(require("purchase_order.manage"))
) -> PurchaseOrder:
    return purchasing_service.mark_purchase_order_sent(db, po_id)


@router.post("/{po_id}/cancel", response_model=PurchaseOrderOut)
def cancel_purchase_order(
    po_id: int, db: Session = Depends(get_db), _user=Depends(require("purchase_order.manage"))
) -> PurchaseOrder:
    return purchasing_service.cancel_purchase_order(db, po_id)


# Permission keys used by this router: purchase_order.manage, inventory.view
