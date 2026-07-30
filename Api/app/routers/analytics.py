from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.schemas.analytics import LowStockItemOut, StatusBreakdownOut, SummaryOut, TimeseriesOut, TopProductOut
from app.services import analytics_service
from app.services.analytics_service import RANGE_TO_DAYS

router = APIRouter()

RangeParam = Literal["7d", "30d", "90d"]


@router.get("/summary", response_model=SummaryOut)
def get_summary(
    range: RangeParam = "30d",
    db: Session = Depends(get_db),
    _user=Depends(require("analytics.view")),
) -> SummaryOut:
    return analytics_service.get_summary(db, RANGE_TO_DAYS[range])


@router.get("/orders-timeseries", response_model=TimeseriesOut)
def get_orders_timeseries(
    range: RangeParam = "30d",
    db: Session = Depends(get_db),
    _user=Depends(require("analytics.view")),
) -> TimeseriesOut:
    return analytics_service.get_orders_timeseries(db, RANGE_TO_DAYS[range])


@router.get("/orders-by-status", response_model=StatusBreakdownOut)
def get_orders_by_status(
    range: RangeParam = "30d",
    db: Session = Depends(get_db),
    _user=Depends(require("analytics.view")),
) -> StatusBreakdownOut:
    return analytics_service.get_orders_by_status(db, RANGE_TO_DAYS[range])


@router.get("/top-products", response_model=list[TopProductOut])
def get_top_products(
    range: RangeParam = "30d",
    limit: int = Query(10, ge=1, le=50),
    locale: str = "ar",
    db: Session = Depends(get_db),
    _user=Depends(require("analytics.view")),
) -> list[TopProductOut]:
    return analytics_service.get_top_products(db, RANGE_TO_DAYS[range], limit, locale)


@router.get("/low-stock", response_model=list[LowStockItemOut])
def get_low_stock(
    limit: int = Query(20, ge=1, le=100),
    locale: str = "ar",
    db: Session = Depends(get_db),
    _user=Depends(require("analytics.view")),
) -> list[LowStockItemOut]:
    return analytics_service.get_low_stock(db, limit, locale)


# Permission keys used by this router: analytics.view
