"use server";

import {
  ShopApiError,
  changePassword,
  fetchAccountAddresses,
  fetchAccountOrder,
  fetchAccountOrders,
  fetchAccountSummary,
  fetchCustomer,
  fetchWishlist,
  getCart,
  getProductList,
  getReviews,
  getVariantStock,
  loginCustomer,
  placeOrder,
  registerCustomer,
  removeFromWishlist,
  saveToWishlist,
  updateProfile,
  validateCoupon,
  type ListQuery,
  type StoredLine,
} from "@/lib/shop-api";
import {
  clearSession,
  getSessionToken,
  setSessionToken,
} from "@/lib/session";
import type {
  AccountSummary,
  Address,
  Cart,
  Customer,
  InsufficientStock,
  LocaleCode,
  PlaceOrderInput,
  OrderDetail,
  OrderSummary,
  PlacedOrder,
  RegisterInput,
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
  const token = await getSessionToken();
  try {
    return { ok: true, order: await placeOrder(input, token, locale) };
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

/* -------------------------------------------------------------------------- */
/* Customer account and wishlist                                              */
/* -------------------------------------------------------------------------- */

/**
 * These run on the server so the session token can live in an httpOnly cookie.
 * A client component calls them and gets back state, never the credential —
 * which is why the wishlist heart can be a plain button with no token handling
 * of its own.
 */

export type AuthResult =
  | { ok: true; customer: Customer }
  | { ok: false; code: string; message: string };

export async function registerAccount(
  input: RegisterInput,
  locale: LocaleCode,
): Promise<AuthResult> {
  try {
    const session = await registerCustomer(input, locale);
    await setSessionToken(session.token);
    return { ok: true, customer: session.customer };
  } catch (error) {
    if (error instanceof ShopApiError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: "unreachable", message: "Could not reach the server." };
  }
}

export async function signIn(
  email: string,
  password: string,
  locale: LocaleCode,
): Promise<AuthResult> {
  try {
    const session = await loginCustomer(email, password, locale);
    await setSessionToken(session.token);
    return { ok: true, customer: session.customer };
  } catch (error) {
    if (error instanceof ShopApiError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: "unreachable", message: "Could not reach the server." };
  }
}

export async function signOut(): Promise<void> {
  await clearSession();
}

/** Current shopper, or null when signed out. Never throws — a dead session
 *  should render the site logged out, not an error page. */
export async function currentCustomer(locale: LocaleCode): Promise<Customer | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await fetchCustomer(token, locale);
  } catch {
    return null;
  }
}

export async function loadWishlist(locale: LocaleCode): Promise<string[]> {
  const token = await getSessionToken();
  if (!token) return [];
  try {
    const result = await fetchWishlist(token, locale);
    return result.product_ids.map(String);
  } catch {
    return [];
  }
}

export type WishlistResult =
  | { ok: true; productIds: string[] }
  | { ok: false; reason: "login_required" };

/**
 * Toggles one product. Returns the whole list back rather than a boolean so
 * the client's view of what is hearted always comes from the server, and two
 * tabs cannot drift apart.
 */
export async function toggleWishlist(
  productId: string,
  saved: boolean,
  locale: LocaleCode,
): Promise<WishlistResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, reason: "login_required" };

  try {
    const result = saved
      ? await removeFromWishlist(productId, token, locale)
      : await saveToWishlist(productId, token, locale);
    return { ok: true, productIds: result.product_ids.map(String) };
  } catch (error) {
    // An expired or revoked cookie is indistinguishable to the shopper from
    // never having signed in, so it gets the same prompt.
    if (error instanceof ShopApiError && error.status === 401) {
      await clearSession();
      return { ok: false, reason: "login_required" };
    }
    throw error;
  }
}

export async function accountSummary(locale: LocaleCode): Promise<AccountSummary | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await fetchAccountSummary(token, locale);
  } catch {
    return null;
  }
}

export async function accountOrders(locale: LocaleCode): Promise<OrderSummary[]> {
  const token = await getSessionToken();
  if (!token) return [];
  try {
    return await fetchAccountOrders(token, locale);
  } catch {
    return [];
  }
}

export type SaveResult = { ok: true } | { ok: false; code: string; message: string };

export async function saveProfile(
  input: { first_name: string; last_name: string; email: string; phone: string | null },
  locale: LocaleCode,
): Promise<SaveResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "login_required", message: "Sign in to continue." };
  try {
    await updateProfile(input, token, locale);
    return { ok: true };
  } catch (error) {
    if (error instanceof ShopApiError) return { ok: false, code: error.code, message: error.message };
    return { ok: false, code: "unreachable", message: "Could not reach the server." };
  }
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
  locale: LocaleCode,
): Promise<SaveResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "login_required", message: "Sign in to continue." };
  try {
    await changePassword(currentPassword, newPassword, token, locale);
    return { ok: true };
  } catch (error) {
    if (error instanceof ShopApiError) return { ok: false, code: error.code, message: error.message };
    return { ok: false, code: "unreachable", message: "Could not reach the server." };
  }
}

export async function accountOrder(
  orderNumber: string,
  locale: LocaleCode,
): Promise<OrderDetail | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await fetchAccountOrder(orderNumber, token, locale);
  } catch {
    // 404 for someone else's order number is indistinguishable from one that
    // does not exist, which is the point.
    return null;
  }
}

export async function accountAddresses(locale: LocaleCode): Promise<Address[]> {
  const token = await getSessionToken();
  if (!token) return [];
  try {
    return await fetchAccountAddresses(token, locale);
  } catch {
    return [];
  }
}
