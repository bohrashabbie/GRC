from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.orders import Coupon
from app.schemas.common import DeletionResultOut
from app.schemas.order import CouponCreate, CouponOut, CouponUpdate
from app.services import coupon_service
from app.utils import paginate

router = APIRouter()


@router.post("", response_model=CouponOut, status_code=status.HTTP_201_CREATED)
def create_coupon(
    payload: CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("coupon.manage")),
) -> Coupon:
    return coupon_service.create_coupon(db, payload, actor_user_id=current_user.id)


@router.get("")
def list_coupons(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("coupon.view")),
) -> dict:
    """Cursor-paginated on (created_at, id) descending. Filters: is_active."""
    stmt = select(Coupon)
    if is_active is not None:
        stmt = stmt.where(Coupon.is_active == is_active)
    items, next_cursor = paginate(db, stmt, Coupon, cursor, limit)
    return {"items": [CouponOut.model_validate(c) for c in items], "next_cursor": next_cursor}


@router.get("/{coupon_id}", response_model=CouponOut)
def get_coupon(
    coupon_id: int, db: Session = Depends(get_db), _user=Depends(require("coupon.view"))
) -> Coupon:
    return coupon_service.get_coupon(db, coupon_id)


@router.patch("/{coupon_id}", response_model=CouponOut)
def update_coupon(
    coupon_id: int,
    payload: CouponUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("coupon.manage")),
) -> Coupon:
    return coupon_service.update_coupon(db, coupon_id, payload, actor_user_id=current_user.id)


@router.delete("/{coupon_id}", response_model=DeletionResultOut)
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("coupon.manage")),
) -> DeletionResultOut:
    """Removes the code, or deactivates it once an order has redeemed it."""
    result = coupon_service.delete_coupon(db, coupon_id, actor_user_id=current_user.id)
    return DeletionResultOut(mode=result.mode, blockers=result.blockers)


# Permission keys used by this router: coupon.view, coupon.manage
