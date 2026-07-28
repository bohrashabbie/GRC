"""Order creation from the storefront cart.

This is the only place an order comes into existence, and the only place stock
leaves. The two happen in one transaction on purpose: an order that exists
without its stock having been taken, or stock taken without an order, are both
worse than a failed checkout.

Nothing about money comes from the browser. The client sends variant ids and
quantities; every price, VAT figure and shipping charge is re-read or
recomputed here, and the line snapshots (Hard Rule 7) are written from those
server-side values so a historical order never has to join back to the live
catalog to reproduce its own total.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import kuwait
from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.catalog import (
    Option,
    OptionValue,
    OptionValueTranslation,
    Product,
    ProductTranslation,
    TaxRate,
    Variant,
    VariantOptionValue,
)
from app.models.orders import Order, OrderAddress, OrderItem, OrderStatusHistory, Payment
from app.services import inventory_service

# VAT-inclusive fallback when tax_rates has no row for the product's class.
# Stored as a fraction per Hard Rule 1, never as 15.
DEFAULT_VAT_RATE = Decimal("0.1500")

# Shipping methods and the free-shipping threshold are stand-ins that mirror
# the storefront's presentation layer one-for-one. shipping_zones/methods/rates
# are out of scope for this build, and the alternative — trusting the price the
# browser sends — is not an option for money. Replace this dict when the real
# shipping tables land; nothing else here changes.
SHIPPING_METHODS: dict[str, Decimal] = {
    "standard": Decimal("25.00"),
    "express": Decimal("45.00"),
    "pickup": Decimal("0.00"),
}
FREE_SHIPPING_THRESHOLD = Decimal("200.00")
FREE_SHIPPING_METHOD = "standard"

MAX_LINES_PER_ORDER = 50


def _money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _tax_rate(db: Session, tax_class: str) -> Decimal:
    """Today's rate for a tax class in Saudi Arabia, or the default. Snapshotted
    onto every line so a rate change never rewrites history."""
    today = date.today()
    rate = db.execute(
        select(TaxRate.rate)
        .where(
            TaxRate.country_code == "SA",
            TaxRate.tax_class == tax_class,
            TaxRate.valid_from <= today,
            (TaxRate.valid_to.is_(None)) | (TaxRate.valid_to >= today),
        )
        .order_by(TaxRate.valid_from.desc())
        .limit(1)
    ).scalar_one_or_none()
    return Decimal(rate) if rate is not None else DEFAULT_VAT_RATE


def _options_snapshot(db: Session, variant_id: int, locale: str) -> dict:
    """{option code: value label} frozen at purchase time, so renaming a colour
    in the admin never changes what an old order says was bought."""
    rows = db.execute(
        select(Option.code, OptionValue.code, OptionValueTranslation.label)
        .join(VariantOptionValue, VariantOptionValue.option_value_id == OptionValue.id)
        .join(Option, Option.id == OptionValue.option_id)
        .join(
            OptionValueTranslation,
            (OptionValueTranslation.option_value_id == OptionValue.id)
            & (OptionValueTranslation.locale == locale),
            isouter=True,
        )
        .where(VariantOptionValue.variant_id == variant_id)
    ).all()
    return {option_code: (label or value_code) for option_code, value_code, label in rows}


def _product_name(product: Product, locale: str) -> str:
    by_locale = {row.locale: row.name for row in product.translations}
    return by_locale.get(locale) or by_locale.get("ar") or by_locale.get("en") or f"Product {product.id}"


def _shipping_total(method_id: str, subtotal: Decimal) -> Decimal:
    if method_id not in SHIPPING_METHODS:
        raise BusinessRuleError(
            f"Unknown shipping method '{method_id}'.",
            code="unknown_shipping_method",
            details={"allowed": sorted(SHIPPING_METHODS)},
        )
    price = SHIPPING_METHODS[method_id]
    # Only the standard method is waived by the threshold — express stays paid,
    # matching what the cart shows the shopper.
    if method_id == FREE_SHIPPING_METHOD and subtotal >= FREE_SHIPPING_THRESHOLD:
        return Decimal("0.00")
    return price


def create_order(db: Session, data, *, locale: str = "ar") -> Order:
    """Create an order and take its stock, atomically.

    Stock is re-checked here and nowhere else that matters: the quantity the
    product page showed may be minutes old, and the quantity the client sends
    is never trusted. If any line cannot be satisfied the whole transaction
    rolls back — no order row, no partial decrement from the lines that had
    already succeeded.
    """
    if not data.lines:
        raise BusinessRuleError("Cannot place an order with an empty cart.", code="empty_cart")
    if len(data.lines) > MAX_LINES_PER_ORDER:
        raise BusinessRuleError(
            f"An order can hold at most {MAX_LINES_PER_ORDER} lines (got {len(data.lines)}).",
            code="too_many_lines",
        )

    variant_ids = [line.variant_id for line in data.lines]
    variants = {
        variant.id: variant
        for variant in db.execute(
            select(Variant).where(Variant.id.in_(variant_ids), Variant.is_active.is_(True))
        ).scalars()
    }
    missing = [variant_id for variant_id in variant_ids if variant_id not in variants]
    if missing:
        raise NotFoundError(
            "Some items are no longer available.",
            details={"variant_ids": missing},
        )

    products = {
        product.id: product
        for product in db.execute(
            select(Product)
            .where(Product.id.in_({v.product_id for v in variants.values()}))
            .options(selectinload(Product.translations))
        ).scalars()
    }
    inactive = [
        variant_id
        for variant_id, variant in variants.items()
        if products[variant.product_id].status != "active"
    ]
    if inactive:
        raise NotFoundError(
            "Some items are no longer available.",
            details={"variant_ids": inactive},
        )

    # Reserve the id up front so order_number can be built from it and be
    # unique without a second UPDATE or a racy count(*).
    order_id = db.execute(select(func.nextval("orders_id_seq"))).scalar_one()
    now = datetime.now(timezone.utc)

    order = Order(
        id=order_id,
        order_number=f"GRC-{order_id + 10_000}",
        customer_id=None,
        email=data.email,
        phone_e164=data.shipping_address.phone,
        status="pending",
        payment_status="unpaid",
        fulfilment_status="unfulfilled",
        currency="SAR",
        locale=locale,
        placed_at=now,
    )
    db.add(order)

    subtotal = Decimal("0.00")
    for line in data.lines:
        variant = variants[line.variant_id]
        product = products[variant.product_id]
        unit_price = Decimal(variant.price if variant.price is not None else product.base_price)
        line_total = _money(unit_price * line.quantity)
        subtotal += line_total

        db.add(
            OrderItem(
                order_id=order_id,
                variant_id=variant.id,
                product_id=product.id,
                sku_snapshot=variant.sku,
                name_snapshot=_product_name(product, locale),
                options_snapshot=_options_snapshot(db, variant.id, locale),
                unit_price_snapshot=_money(unit_price),
                tax_rate_snapshot=_tax_rate(db, product.tax_class),
                qty=line.quantity,
                line_total=line_total,
            )
        )

    subtotal = _money(subtotal)
    shipping_total = _shipping_total(data.shipping_method_id, subtotal)
    grand_total = _money(subtotal + shipping_total)
    # Customer-facing prices are VAT-inclusive, so VAT is extracted from the
    # total rather than added to it (Hard Rule 1).
    vat_rate = _tax_rate(db, "standard")
    tax_total = _money(grand_total - (grand_total / (Decimal("1") + vat_rate)))

    order.subtotal = subtotal
    # Coupons are out of scope for this backend, so an order never carries a
    # discount. The storefront's coupon box is fixture-only; nothing it does
    # reaches this figure.
    order.discount_total = Decimal("0.00")
    order.shipping_total = shipping_total
    order.tax_total = tax_total
    order.grand_total = grand_total

    address = data.shipping_address
    # Governorate and area names are resolved from their slugs rather than
    # taken from the request, so the snapshot can never carry a label that
    # disagrees with the code the shopper actually picked.
    governorate_name = kuwait.governorate_name(address.governorate_id, locale)
    area_name = kuwait.area_name(address.area_id, locale)
    if governorate_name is None or area_name is None:
        raise BusinessRuleError(
            "Unknown governorate or area for this delivery address.",
            code="unknown_delivery_area",
            details={"governorate_id": address.governorate_id, "area_id": address.area_id},
        )

    db.add(
        OrderAddress(
            order_id=order_id,
            type="shipping",
            recipient_name=address.full_name,
            phone_e164=address.phone,
            # Kuwait addresses have no street numbering to speak of, so the
            # building and the street are the two lines that matter, and the
            # block is the district-level division above them.
            line1=f"Street {address.street}, Building {address.building}",
            line2=address.extra_directions,
            district=f"Block {address.block}",
            city=area_name,
            region_name=governorate_name,
            postal_code=None,
            country_code="KW",
            national_short_address=None,
        )
    )
    db.add(
        OrderStatusHistory(
            order_id=order_id,
            field="status",
            from_value=None,
            to_value="pending",
            actor_type="customer",
            actor_user_id=None,
            reason="Order placed",
        )
    )
    # No gateway in this build: the payment is recorded as initiated so the
    # admin can see the intent, and is never marked captured by this code.
    db.add(
        Payment(
            order_id=order_id,
            provider="manual",
            method=data.payment_method_code,
            amount=grand_total,
            currency="SAR",
            status="initiated",
            idempotency_key=f"order-{order_id}-initial",
        )
    )

    # Last thing before the commit, and inside the same transaction: if this
    # raises, everything above is rolled back with it.
    inventory_service.decrement_for_order(
        db,
        lines=[(line.variant_id, line.quantity) for line in data.lines],
        order_id=order_id,
        locale=locale,
    )

    db.commit()
    db.refresh(order)
    return order
