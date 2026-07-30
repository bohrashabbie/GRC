from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class KpiValue(BaseModel):
    value: Decimal
    previous: Decimal
    change_pct: float | None


class SummaryOut(BaseModel):
    range_days: int
    revenue: KpiValue
    orders: KpiValue
    avg_order_value: KpiValue
    active_customers: KpiValue


class TimeseriesPoint(BaseModel):
    date: date
    orders_count: int
    revenue: Decimal


class TimeseriesOut(BaseModel):
    points: list[TimeseriesPoint]


class StatusCount(BaseModel):
    status: str
    count: int


class StatusBreakdownOut(BaseModel):
    by_status: list[StatusCount]
    by_payment_status: list[StatusCount]


class TopProductOut(BaseModel):
    product_id: int
    name: str
    sku: str | None
    units_sold: int
    revenue: Decimal


class LowStockItemOut(BaseModel):
    variant_id: int
    sku: str
    product_name: str
    on_hand: int
    threshold: int
