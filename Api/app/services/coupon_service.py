"""Discount codes: staff CRUD, and the validation checkout runs before it
takes a fils off a total.

The rule that matters here is that a code is validated and redeemed inside the
order's own transaction. Validating in one request and trusting the browser to
send the discount back is not an option for money, so `quote` is advisory (it
is what the cart box calls) and `redeem` is what actually counts a use, under a
row lock so two simultaneous checkouts cannot both take the last use of a
capped code.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, ConflictError, NotFoundError
from app.models.orders import Coupon, CouponRedemption
from app.services import audit_service, deletion

DISCOUNT_TYPES = ("percent", "fixed")


def _money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def _invalid(message: str, code: str) -> BusinessRuleError:
    return BusinessRuleError(message, code=code)


# --------------------------------------------------------------------------
# Staff CRUD
# --------------------------------------------------------------------------

def get_coupon(db: Session, coupon_id: int) -> Coupon:
    coupon = db.get(Coupon, coupon_id)
    if coupon is None:
        raise NotFoundError("Coupon not found")
    return coupon


def _check_shape(discount_type: str, value: Decimal) -> None:
    if discount_type not in DISCOUNT_TYPES:
        raise _invalid(
            f"Unsupported discount type '{discount_type}'. Expected percent or fixed.",
            "invalid_discount_type",
        )
    if value <= 0:
        raise _invalid("A discount must be greater than zero.", "invalid_discount_value")
    if discount_type == "percent" and value > 100:
        raise _invalid(
            "A percentage discount cannot exceed 100%.", "invalid_discount_value"
        )


def create_coupon(db: Session, data, *, actor_user_id: int | None) -> Coupon:
    _check_shape(data.discount_type, Decimal(data.value))
    if data.starts_at and data.ends_at and data.ends_at <= data.starts_at:
        raise _invalid("The end date must be after the start date.", "invalid_coupon_window")

    code = data.code.strip()
    existing = db.execute(select(Coupon).where(Coupon.code == code)).scalar_one_or_none()
    if existing is not None:
        raise ConflictError(f"Coupon '{code}' already exists.", code="duplicate_coupon_code")

    coupon = Coupon(
        code=code,
        discount_type=data.discount_type,
        value=data.value,
        min_subtotal=data.min_subtotal,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        max_redemptions=data.max_redemptions,
        is_active=data.is_active,
    )
    db.add(coupon)
    db.flush()
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="coupon.created",
        entity_type="coupon",
        entity_id=coupon.id,
        before=None,
        after={"code": code, "discount_type": data.discount_type, "value": str(data.value)},
    )
    db.commit()
    db.refresh(coupon)
    return coupon


def update_coupon(db: Session, coupon_id: int, data, *, actor_user_id: int | None) -> Coupon:
    coupon = get_coupon(db, coupon_id)
    fields = data.model_dump(exclude_unset=True)

    # Validate against the values the row will hold, not only what was sent —
    # switching to percent while leaving an old fixed value of 500 must fail.
    discount_type = fields.get("discount_type", coupon.discount_type)
    value = Decimal(str(fields.get("value", coupon.value)))
    _check_shape(discount_type, value)

    starts_at = fields.get("starts_at", coupon.starts_at)
    ends_at = fields.get("ends_at", coupon.ends_at)
    if starts_at and ends_at and ends_at <= starts_at:
        raise _invalid("The end date must be after the start date.", "invalid_coupon_window")

    if "code" in fields:
        fields["code"] = fields["code"].strip()
        clash = db.execute(
            select(Coupon).where(Coupon.code == fields["code"], Coupon.id != coupon_id)
        ).scalar_one_or_none()
        if clash is not None:
            raise ConflictError(
                f"Coupon '{fields['code']}' already exists.", code="duplicate_coupon_code"
            )

    before, after = audit_service.diff_changed_fields(coupon, fields)
    for field, val in fields.items():
        setattr(coupon, field, val)
    if after:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="coupon.updated",
            entity_type="coupon",
            entity_id=coupon.id,
            before=before,
            after=after,
        )
    db.commit()
    db.refresh(coupon)
    return coupon


def delete_coupon(db: Session, coupon_id: int, *, actor_user_id: int | None) -> deletion.DeletionResult:
    """Remove the code, or deactivate it once it has been used.

    A redeemed coupon is part of how an order's total came to be, so the row
    stays for as long as any redemption points at it.
    """
    coupon = get_coupon(db, coupon_id)
    before = {"code": coupon.code, "is_active": coupon.is_active}
    blockers = deletion.find_blockers(
        db,
        [("redemptions", select(CouponRedemption.id).where(CouponRedemption.coupon_id == coupon_id))],
    )
    if blockers:
        coupon.is_active = False
        mode = deletion.DEACTIVATED
    else:
        db.delete(coupon)
        mode = deletion.DELETED
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action=f"coupon.{mode}",
        entity_type="coupon",
        entity_id=coupon_id,
        before=before,
        after=None if mode == deletion.DELETED else {"is_active": False},
    )
    db.commit()
    return deletion.DeletionResult(mode, blockers)


# --------------------------------------------------------------------------
# Validation & redemption
# --------------------------------------------------------------------------

def discount_for(coupon: Coupon, subtotal: Decimal) -> Decimal:
    """What the code takes off this subtotal.

    Capped at the subtotal itself: a fixed 20 KWD code on a 12 KWD cart is a
    12 KWD discount, never a 8 KWD refund.
    """
    if coupon.discount_type == "percent":
        raw = subtotal * (Decimal(str(coupon.value)) / Decimal("100"))
    else:
        raw = Decimal(str(coupon.value))
    return _money(min(raw, subtotal))


def _assert_usable(coupon: Coupon, subtotal: Decimal, *, now: datetime) -> None:
    if not coupon.is_active:
        raise _invalid("This code is no longer available.", "coupon_inactive")
    if coupon.starts_at and coupon.starts_at > now:
        raise _invalid("This code is not active yet.", "coupon_not_started")
    if coupon.ends_at and coupon.ends_at <= now:
        raise _invalid("This code has expired.", "coupon_expired")
    if coupon.max_redemptions is not None and coupon.times_redeemed >= coupon.max_redemptions:
        raise _invalid("This code has been fully redeemed.", "coupon_exhausted")
    if coupon.min_subtotal is not None and subtotal < Decimal(str(coupon.min_subtotal)):
        raise BusinessRuleError(
            "This code needs a larger order to apply.",
            code="coupon_min_subtotal",
            details={"min_subtotal": str(coupon.min_subtotal)},
        )


def _find(db: Session, code: str, *, lock: bool) -> Coupon:
    stmt = select(Coupon).where(Coupon.code == code.strip())
    if lock:
        stmt = stmt.with_for_update()
    coupon = db.execute(stmt).scalar_one_or_none()
    if coupon is None:
        raise _invalid("That code was not recognised.", "coupon_not_found")
    return coupon


def quote(db: Session, code: str, subtotal: Decimal) -> dict:
    """Advisory check for the cart's coupon box. Deliberately does not reserve
    anything — the authoritative check is `redeem` inside the order's own
    transaction, so a code exhausted between here and checkout still fails."""
    coupon = _find(db, code, lock=False)
    _assert_usable(coupon, subtotal, now=datetime.now(timezone.utc))
    return {
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "value": str(coupon.value),
        "discount_total": str(discount_for(coupon, subtotal)),
    }


def redeem(db: Session, code: str, subtotal: Decimal, *, order_id: int, customer_id: int | None) -> Decimal:
    """Validate and count one use, in the caller's transaction.

    Locks the coupon row before re-reading times_redeemed so two checkouts
    racing for the last use of a capped code cannot both succeed. The caller
    commits; nothing here does.
    """
    coupon = _find(db, code, lock=True)
    _assert_usable(coupon, subtotal, now=datetime.now(timezone.utc))
    amount = discount_for(coupon, subtotal)
    coupon.times_redeemed = coupon.times_redeemed + 1
    db.add(
        CouponRedemption(
            coupon_id=coupon.id,
            order_id=order_id,
            customer_id=customer_id,
            amount=amount,
        )
    )
    return amount


def redemption_counts(db: Session, coupon_ids: list[int]) -> dict[int, int]:
    """Actual ledger counts, for the admin list to show alongside the cached
    times_redeemed."""
    if not coupon_ids:
        return {}
    rows = db.execute(
        select(CouponRedemption.coupon_id, func.count())
        .where(CouponRedemption.coupon_id.in_(coupon_ids))
        .group_by(CouponRedemption.coupon_id)
    ).all()
    return {coupon_id: count for coupon_id, count in rows}
