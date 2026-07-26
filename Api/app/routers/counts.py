from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.inventory import StockCount
from app.schemas.inventory import StockCountCreate, StockCountOut, StockCountRecordRequest
from app.services import inventory_service

router = APIRouter()


@router.post("", response_model=StockCountOut, status_code=status.HTTP_201_CREATED)
def create_stock_count(
    payload: StockCountCreate, db: Session = Depends(get_db), current_user: User = Depends(require("stock.count"))
) -> StockCount:
    return inventory_service.create_stock_count(db, payload, current_user.id)


@router.get("/{count_id}", response_model=StockCountOut)
def get_stock_count(
    count_id: int, db: Session = Depends(get_db), _user=Depends(require("inventory.view"))
) -> StockCount:
    return inventory_service.get_stock_count(db, count_id)


@router.post("/{count_id}/record", response_model=StockCountOut)
def record_count(
    count_id: int,
    payload: StockCountRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("stock.count")),
) -> StockCount:
    recorded = {i.item_id: i.counted_qty for i in payload.items}
    return inventory_service.record_count(db, count_id, recorded, current_user.id)


@router.post("/{count_id}/apply", response_model=StockCountOut)
def apply_stock_count(
    count_id: int, db: Session = Depends(get_db), current_user: User = Depends(require("stock.count"))
) -> StockCount:
    """Turns counted variances into stock_movements (reason=count_correction).
    Requires a different user than the one who started the count."""
    return inventory_service.apply_stock_count(db, count_id, current_user.id)


# Permission keys used by this router: stock.count, inventory.view
