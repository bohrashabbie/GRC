from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import and_, distinct, func, select
from sqlalchemy.orm import Session

from app.models.catalog import Product, ProductTranslation, Variant
from app.models.inventory import StockLevel
from app.models.orders import Order, OrderItem
from app.schemas.analytics import (
    KpiValue,
    LowStockItemOut,
    StatusBreakdownOut,
    StatusCount,
    SummaryOut,
    TimeseriesOut,
    TimeseriesPoint,
    TopProductOut,
)

RANGE_TO_DAYS = {"7d": 7, "30d": 30, "90d": 90}


def _period_metrics(db: Session, start: datetime, end: datetime) -> dict:
    row = db.execute(
        select(
            func.count(Order.id).filter(Order.status != "cancelled").label("orders_count"),
            func.coalesce(
                func.sum(Order.grand_total).filter(Order.payment_status == "paid"), 0
            ).label("revenue"),
            func.count(Order.id).filter(Order.payment_status == "paid").label("paid_count"),
            func.count(distinct(Order.customer_id)).label("active_customers"),
        ).where(Order.placed_at >= start, Order.placed_at < end)
    ).one()
    return {
        "orders_count": row.orders_count,
        "revenue": Decimal(row.revenue),
        "paid_count": row.paid_count,
        "active_customers": row.active_customers,
    }


def _kpi(current: Decimal, previous: Decimal) -> KpiValue:
    change_pct = float((current - previous) / previous * 100) if previous else None
    return KpiValue(value=current, previous=previous, change_pct=change_pct)


def get_summary(db: Session, range_days: int) -> SummaryOut:
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=range_days)
    prev_start = period_start - timedelta(days=range_days)

    current = _period_metrics(db, period_start, now)
    previous = _period_metrics(db, prev_start, period_start)

    current_aov = current["revenue"] / current["paid_count"] if current["paid_count"] else Decimal(0)
    previous_aov = previous["revenue"] / previous["paid_count"] if previous["paid_count"] else Decimal(0)

    return SummaryOut(
        range_days=range_days,
        revenue=_kpi(current["revenue"], previous["revenue"]),
        orders=_kpi(Decimal(current["orders_count"]), Decimal(previous["orders_count"])),
        avg_order_value=_kpi(current_aov, previous_aov),
        active_customers=_kpi(
            Decimal(current["active_customers"]), Decimal(previous["active_customers"])
        ),
    )


def get_orders_timeseries(db: Session, range_days: int) -> TimeseriesOut:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=range_days)

    bucket = func.date_trunc("day", Order.placed_at).label("bucket")
    rows = db.execute(
        select(
            bucket,
            func.count(Order.id).filter(Order.status != "cancelled").label("orders_count"),
            func.coalesce(
                func.sum(Order.grand_total).filter(Order.payment_status == "paid"), 0
            ).label("revenue"),
        )
        .where(Order.placed_at >= start, Order.placed_at < now)
        .group_by(bucket)
    ).all()
    by_day = {row.bucket.date(): row for row in rows}

    start_date = start.date()
    end_date = now.date()
    points = []
    for i in range((end_date - start_date).days + 1):
        day = start_date + timedelta(days=i)
        row = by_day.get(day)
        points.append(
            TimeseriesPoint(
                date=day,
                orders_count=row.orders_count if row else 0,
                revenue=Decimal(row.revenue) if row else Decimal(0),
            )
        )
    return TimeseriesOut(points=points)


def get_orders_by_status(db: Session, range_days: int) -> StatusBreakdownOut:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=range_days)

    status_rows = db.execute(
        select(Order.status, func.count(Order.id))
        .where(Order.placed_at >= start, Order.placed_at < now)
        .group_by(Order.status)
        .order_by(func.count(Order.id).desc())
    ).all()
    payment_rows = db.execute(
        select(Order.payment_status, func.count(Order.id))
        .where(Order.placed_at >= start, Order.placed_at < now)
        .group_by(Order.payment_status)
        .order_by(func.count(Order.id).desc())
    ).all()

    return StatusBreakdownOut(
        by_status=[StatusCount(status=s, count=c) for s, c in status_rows],
        by_payment_status=[StatusCount(status=s, count=c) for s, c in payment_rows],
    )


def get_top_products(db: Session, range_days: int, limit: int, locale: str) -> list[TopProductOut]:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=range_days)

    stmt = (
        select(
            OrderItem.product_id,
            ProductTranslation.name,
            func.min(OrderItem.sku_snapshot).label("sku"),
            func.sum(OrderItem.qty).label("units_sold"),
            func.sum(OrderItem.line_total).label("revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .outerjoin(
            ProductTranslation,
            and_(
                ProductTranslation.product_id == OrderItem.product_id,
                ProductTranslation.locale == locale,
            ),
        )
        .where(Order.placed_at >= start, Order.placed_at < now, Order.status != "cancelled")
        .group_by(OrderItem.product_id, ProductTranslation.name)
        .order_by(func.sum(OrderItem.line_total).desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    return [
        TopProductOut(
            product_id=r.product_id,
            name=r.name or r.sku or f"#{r.product_id}",
            sku=r.sku,
            units_sold=int(r.units_sold),
            revenue=Decimal(r.revenue),
        )
        for r in rows
    ]


def get_low_stock(db: Session, limit: int, locale: str) -> list[LowStockItemOut]:
    on_hand_sum = func.sum(StockLevel.on_hand)
    stmt = (
        select(
            Variant.id.label("variant_id"),
            Variant.sku,
            ProductTranslation.name.label("product_name"),
            on_hand_sum.label("on_hand"),
            Variant.low_stock_threshold,
        )
        .join(StockLevel, StockLevel.variant_id == Variant.id)
        .join(Product, Product.id == Variant.product_id)
        .outerjoin(
            ProductTranslation,
            and_(ProductTranslation.product_id == Product.id, ProductTranslation.locale == locale),
        )
        .where(Variant.low_stock_threshold.isnot(None), Variant.is_active.is_(True))
        .group_by(Variant.id, Variant.sku, ProductTranslation.name, Variant.low_stock_threshold)
        .having(on_hand_sum <= Variant.low_stock_threshold)
        .order_by(on_hand_sum.asc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    return [
        LowStockItemOut(
            variant_id=r.variant_id,
            sku=r.sku,
            product_name=r.product_name or r.sku,
            on_hand=int(r.on_hand or 0),
            threshold=r.low_stock_threshold,
        )
        for r in rows
    ]
