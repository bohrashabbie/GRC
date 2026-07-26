from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.inventory import StockTransfer
from app.schemas.inventory import TransferCreate, TransferDispatchRequest, TransferOut, TransferReceiveRequest
from app.services import inventory_service

router = APIRouter()


@router.post("", response_model=TransferOut, status_code=status.HTTP_201_CREATED)
def create_transfer(
    payload: TransferCreate, db: Session = Depends(get_db), current_user: User = Depends(require("stock.transfer"))
) -> StockTransfer:
    return inventory_service.create_transfer(db, payload, current_user.id)


@router.get("/{transfer_id}", response_model=TransferOut)
def get_transfer(
    transfer_id: int, db: Session = Depends(get_db), _user=Depends(require("inventory.view"))
) -> StockTransfer:
    return inventory_service.get_transfer(db, transfer_id)


@router.post("/{transfer_id}/dispatch", response_model=TransferOut)
def dispatch_transfer(
    transfer_id: int,
    payload: TransferDispatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("stock.transfer")),
) -> StockTransfer:
    overrides = {i.item_id: i.qty_dispatched for i in payload.items if i.qty_dispatched is not None}
    return inventory_service.dispatch_transfer(db, transfer_id, overrides, current_user.id)


@router.post("/{transfer_id}/receive", response_model=TransferOut)
def receive_transfer(
    transfer_id: int,
    payload: TransferReceiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("stock.transfer")),
) -> StockTransfer:
    received = {i.item_id: i.qty_received for i in payload.items}
    return inventory_service.receive_transfer(db, transfer_id, received, current_user.id)


# Permission keys used by this router: stock.transfer, inventory.view
