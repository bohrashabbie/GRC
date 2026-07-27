/**
 * TEMPORARY — a stand-in for server-side cart calculation. See ./README.md.
 *
 * The storefront's hard rule is that no price, tax, discount or shipping
 * figure is ever computed in a component. That rule is about *where* the
 * arithmetic lives, and it still holds here: this module plays the role the
 * `/shop/v1/cart` endpoint will play, and components consume its output as
 * opaque server-supplied strings exactly as they will consume the real thing.
 *
 * Nothing outside `src/mocks/` and `src/lib/shop-api.ts` may import this.
 * When the cart API lands, delete this file — the components do not change.
 *
 * Money is handled in integer halalas throughout so 0.1 + 0.2 never appears
 * in a total.
 */

import type { AppliedCoupon, Cart, CartLine, CartTotals, LocaleCode } from "@/types/shop";
import { fixtureProductDetail } from "./catalog";
import { img } from "./shared";

const VAT_RATE = 0.15;
const FREE_SHIPPING_THRESHOLD = 20_000; // 200.00 SAR in halalas
const FLAT_SHIPPING = 2_500; // 25.00 SAR

const toHalalas = (value: string) => Math.round(Number(value) * 100);
const toMoney = (halalas: number) => (halalas / 100).toFixed(2);

/** What the client persists — ids and quantities only, never prices. */
export interface StoredLine {
  variantId: string;
  productSlug: string;
  quantity: number;
}

const COUPONS: Record<string, { type: "percent" | "fixed"; value: number; label: string }> = {
  GR810: { type: "percent", value: 10, label: "GR810 — 10%" },
  WELCOME50: { type: "fixed", value: 5_000, label: "WELCOME50 — 50 SAR" },
};

export function fixtureValidateCoupon(code: string): boolean {
  return code.trim().toUpperCase() in COUPONS;
}

/**
 * Rebuilds the whole cart from stored ids. Prices are always re-read from the
 * catalogue rather than trusted from client storage — the same reason the real
 * endpoint will never accept a price from the browser.
 */
export function fixtureBuildCart(
  stored: StoredLine[],
  locale: LocaleCode,
  couponCode: string | null,
  shippingMethodPrice: string | null,
): Cart {
  const lines: CartLine[] = [];

  for (const entry of stored) {
    const product = fixtureProductDetail(entry.productSlug, locale);
    if (!product) continue;

    const variant = product.variants.find((v) => v.id === entry.variantId);
    if (!variant) continue;

    // Resolve the variant's option ids back into a readable label.
    const optionsLabel = product.options
      .map((option) => {
        const valueId = variant.option_values[option.id];
        return option.values.find((value) => value.id === valueId)?.name;
      })
      .filter(Boolean)
      .join(" · ");

    const colourValueId = variant.option_values.colour;
    const image =
      product.media.find((m) => m.option_value_id === colourValueId) ??
      product.media[0] ??
      img(1, product.name);

    const unit = toHalalas(variant.price);
    const maxQuantity = variant.available_quantity;
    const quantity =
      maxQuantity !== null && maxQuantity > 0 ? Math.min(entry.quantity, maxQuantity) : entry.quantity;

    lines.push({
      id: entry.variantId,
      variant_id: variant.id,
      product_slug: product.slug,
      name: product.name,
      options_label: optionsLabel || null,
      sku: variant.sku,
      image,
      quantity,
      unit_price: variant.price,
      line_total: toMoney(unit * quantity),
      compare_at_unit_price: variant.compare_at_price,
      stock_state: variant.stock_state,
      max_quantity: maxQuantity,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + toHalalas(line.line_total), 0);

  let discount = 0;
  let coupon: AppliedCoupon | null = null;
  const normalised = couponCode?.trim().toUpperCase();
  if (normalised && COUPONS[normalised]) {
    const rule = COUPONS[normalised];
    discount =
      rule.type === "percent" ? Math.round((subtotal * rule.value) / 100) : Math.min(rule.value, subtotal);
    coupon = { code: normalised, label: rule.label, discount_amount: toMoney(discount) };
  }

  const afterDiscount = subtotal - discount;

  // The threshold is evaluated after discount, which is the stricter reading
  // and the one that avoids a total dropping below it post-coupon.
  const qualifiesFreeShipping = afterDiscount >= FREE_SHIPPING_THRESHOLD;
  const explicitShipping = shippingMethodPrice ? toHalalas(shippingMethodPrice) : null;
  const shipping =
    lines.length === 0
      ? 0
      : explicitShipping !== null
        ? qualifiesFreeShipping && explicitShipping === FLAT_SHIPPING
          ? 0
          : explicitShipping
        : qualifiesFreeShipping
          ? 0
          : FLAT_SHIPPING;

  const grandTotal = afterDiscount + shipping;

  // Prices are VAT-inclusive, so tax is extracted from the total rather than
  // added on top.
  const tax = Math.round(grandTotal - grandTotal / (1 + VAT_RATE));

  const totals: CartTotals = {
    subtotal: toMoney(subtotal),
    discount_total: toMoney(discount),
    shipping_total: toMoney(shipping),
    tax_total: toMoney(tax),
    grand_total: toMoney(grandTotal),
    free_shipping_remaining:
      lines.length > 0 && !qualifiesFreeShipping
        ? toMoney(FREE_SHIPPING_THRESHOLD - afterDiscount)
        : null,
    free_shipping_threshold: toMoney(FREE_SHIPPING_THRESHOLD),
  };

  return {
    id: "fixture-cart",
    lines,
    totals,
    coupon,
    item_count: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}
