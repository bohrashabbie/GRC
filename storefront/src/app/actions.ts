"use server";

import {
  ShopApiError,
  getCart,
  getProductList,
  getReviews,
  getVariantStock,
  placeOrder,
  validateCoupon,
  type ListQuery,
  type StoredLine,
} from "@/lib/shop-api";
import type {
  Cart,
  InsufficientStock,
  LocaleCode,
  PlaceOrderInput,
  PlacedOrder,
  ProductListResponse,
  ReviewListResponse,
  VariantStock,
} from "@/types/shop";

/**
 * Server Actions for incremental loading.
 *
 * "Load more" cannot be a URL change — that would re-render the page and lose
 * the already-visible results. Routing it through a Server Action keeps the
 * data-fetching layer on the server, so `shop-api` never has to work in two
 * environments and the fixture flag stays a server concern.
 */

export async function loadMoreProducts(
  query: ListQuery,
  cursor: string,
  locale: LocaleCode,
): Promise<ProductListResponse> {
  return getProductList({ ...query, cursor }, locale);
}

export async function loadMoreReviews(
  slug: string,
  cursor: string,
  locale: LocaleCode,
): Promise<ReviewListResponse> {
  return getReviews(slug, locale, cursor);
}

/**
 * Rebuilds the cart from the ids the browser holds.
 *
 * The client stores variant ids and quantities and nothing else — never a
 * price. Every figure comes back from here, which is the same contract the
 * real `/shop/v1/cart` endpoint will honour.
 */
export async function rebuildCart(
  stored: StoredLine[],
  locale: LocaleCode,
  couponCode: string | null,
  shippingPrice: string | null,
): Promise<Cart> {
  return getCart(stored, locale, couponCode, shippingPrice);
}

export async function checkCoupon(code: string, locale: LocaleCode): Promise<boolean> {
  return validateCoupon(code, locale);
}

/** Live availability for the ids the cart is holding, so steppers can clamp. */
export async function checkStock(
  variantIds: number[],
  locale: LocaleCode,
): Promise<VariantStock[]> {
  try {
    return await getVariantStock(variantIds, locale);
  } catch {
    // Advisory only. If the check itself fails, the cart keeps working and the
    // authoritative guard at submit still stops an oversell.
    return [];
  }
}

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; reason: "insufficient_stock"; detail: InsufficientStock | null }
  | { ok: false; reason: "failed"; message: string };

/**
 * Submits the order.
 *
 * Errors are returned rather than thrown so the checkout panel can render the
 * one case that is not really an error — someone else bought the last one
 * while this shopper was filling in their address — differently from a genuine
 * failure. The server re-checks stock inside the order transaction, so the
 * quantity the browser sends is never what decides the outcome.
 */
export async function submitOrder(
  input: PlaceOrderInput,
  locale: LocaleCode,
): Promise<PlaceOrderResult> {
  try {
    return { ok: true, order: await placeOrder(input, locale) };
  } catch (error) {
    if (error instanceof ShopApiError && error.code === "insufficient_stock") {
      return {
        ok: false,
        reason: "insufficient_stock",
        detail: (error.details as unknown as InsufficientStock) ?? null,
      };
    }
    return {
      ok: false,
      reason: "failed",
      message: error instanceof Error ? error.message : "Checkout failed",
    };
  }
}
