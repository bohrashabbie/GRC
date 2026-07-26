from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.inventory import StockLevel, StockMovement
from app.schemas.inventory import StockAdjustRequest, StockLevelOut, StockMovementOut
from app.services import inventory_service

router = APIRouter()


@router.get("/stock", response_model=list[StockLevelOut])
def get_stock(
    variant_id: int = Query(...), db: Session = Depends(get_db), _user=Depends(require("inventory.view"))
) -> list[StockLevel]:
    """Current stock levels for one variant across all locations."""
    return inventory_service.get_stock_levels(db, variant_id)


@router.post("/stock/adjust", response_model=StockMovementOut)
def adjust_stock(
    payload: StockAdjustRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("stock.adjust")),
) -> StockMovement:
    """Manual stock adjustment. Always goes through inventory_service — never
    writes stock_levels directly — and always writes both a stock_movements
    row and an audit_log row in the same transaction."""
    return inventory_service.adjust_stock(db, payload, current_user.id)


# Permission keys used by this router: inventory.view, stock.adjust
