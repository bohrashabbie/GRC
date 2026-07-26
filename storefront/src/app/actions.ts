"use server";

import {
  getCart,
  getProductList,
  getReviews,
  validateCoupon,
  type ListQuery,
  type StoredLine,
} from "@/lib/shop-api";
import type { Cart, LocaleCode, ProductListResponse, ReviewListResponse } from "@/types/shop";

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
