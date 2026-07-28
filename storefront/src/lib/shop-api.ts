import type {
  Address,
  Banner,
  BannerPlacement,
  Cart,
  CategoryNode,
  City,
  Collection,
  LocaleCode,
  Menu,
  OrderDetail,
  OrderSummary,
  PaymentMethod,
  PlaceOrderInput,
  PlacedOrder,
  ProductCard,
  ProductDetail,
  ProductListResponse,
  Region,
  ReviewListResponse,
  ShippingMethod,
  StaticPage,
  StoreLocation,
  VariantStock,
} from "@/types/shop";
import {
  fixtureAddresses,
  fixtureBanners,
  fixtureBuildCart,
  fixtureCategory,
  fixtureCategoryPath,
  fixtureCategoryTree,
  fixtureCities,
  fixtureCollection,
  fixtureMenu,
  fixtureOrder,
  fixtureOrders,
  fixturePage,
  fixturePageSlugs,
  fixturePaymentMethods,
  fixtureProductDetail,
  fixtureProductList,
  fixtureProductSlugs,
  fixtureRegions,
  fixtureRelatedProducts,
  fixtureReviews,
  fixtureShippingMethods,
  fixtureStores,
  fixtureValidateCoupon,
  type ListQuery,
  type StoredLine,
} from "@/mocks/fixtures";

/**
 * The single boundary between the storefront and `/shop/v1`.
 *
 * While `USE_FIXTURES` is on, every function here short-circuits to
 * `src/mocks/`. No component imports a fixture directly, so switching the flag
 * off is the whole migration. See `src/mocks/README.md`.
 */

const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES !== "false";
const USE_LIVE_CATALOG = process.env.NEXT_PUBLIC_USE_LIVE_CATALOG !== "false";
const ALLOW_CATALOG_FALLBACK = process.env.CATALOG_FALLBACK !== "false";
/** Overrides every per-call ISR window. 0 means read live on every request. */
const REVALIDATE_OVERRIDE = Number.isFinite(Number(process.env.CATALOG_REVALIDATE_SECONDS))
  ? Number(process.env.CATALOG_REVALIDATE_SECONDS)
  : null;
const BASE_URL =
  process.env.SHOP_API_URL ??
  process.env.NEXT_PUBLIC_SHOP_API_URL ??
  "http://localhost:8000/shop/v1";

export class ShopApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> | null = null,
    readonly status: number = 500,
  ) {
    super(message);
    this.name = "ShopApiError";
  }
}

interface FetchOptions {
  locale: LocaleCode;
  /** ISR window in seconds. Catalogue reads are cacheable; carts are not. */
  revalidate?: number | false;
  searchParams?: Record<string, string | number | undefined>;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

async function shopFetch<T>(path: string, options: FetchOptions): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  // `CATALOG_REVALIDATE_SECONDS=0` makes every catalogue read live, which also
  // opts these routes out of static prerendering. Without it a product added in
  // the admin stays invisible until the ISR window expires or the image is
  // rebuilt — fine under traffic, wrong while the catalogue is being built.
  const live =
    options.revalidate === false ||
    (REVALIDATE_OVERRIDE !== null && REVALIDATE_OVERRIDE <= 0);
  const window =
    REVALIDATE_OVERRIDE !== null ? REVALIDATE_OVERRIDE : options.revalidate || 300;

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Accept-Language": options.locale,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    next: live ? undefined : { revalidate: window },
    cache: live ? "no-store" : undefined,
  });

  if (!response.ok) {
    // The backend normalises every error to {code, message, details}; if we
    // got something else, the request never reached the app layer.
    const body = await response.json().catch(() => null);
    throw new ShopApiError(
      body?.code ?? "upstream_error",
      body?.message ?? `Request to ${path} failed with ${response.status}`,
      body?.details ?? null,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

async function liveCatalog<T>(request: () => Promise<T>, fixture: () => T): Promise<T> {
  if (!USE_LIVE_CATALOG) return fixture();
  try {
    return await request();
  } catch (error) {
    if (!USE_FIXTURES || !ALLOW_CATALOG_FALLBACK) throw error;
    if (error instanceof ShopApiError && error.status < 500 && error.status !== 404) throw error;
    return fixture();
  }
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

export async function getCategoryTree(locale: LocaleCode): Promise<CategoryNode[]> {
  return liveCatalog(
    () => shopFetch<CategoryNode[]>("/categories/tree", { locale, revalidate: 3600 }),
    () => fixtureCategoryTree(locale),
  );
}

export async function getCategory(slug: string, locale: LocaleCode): Promise<CategoryNode | null> {
  try {
    return await liveCatalog(
      () => shopFetch<CategoryNode>(`/categories/${slug}`, { locale, revalidate: 3600 }),
      () => fixtureCategory(slug, locale),
    );
  } catch (error) {
    if (error instanceof ShopApiError && error.status === 404) return null;
    throw error;
  }
}

/** Ancestor chain for breadcrumbs, root-first, excluding the node itself. */
export async function getCategoryPath(
  slug: string,
  locale: LocaleCode,
): Promise<CategoryNode[]> {
  return liveCatalog(
    () => shopFetch<CategoryNode[]>(`/categories/${slug}/path`, { locale, revalidate: 3600 }),
    () => fixtureCategoryPath(slug, locale),
  );
}

export async function getProductList(
  query: ListQuery,
  locale: LocaleCode,
): Promise<ProductListResponse> {
  return liveCatalog(
    () => shopFetch<ProductListResponse>("/products", {
      locale,
      revalidate: 300,
      searchParams: {
        category: query.category,
        collection: query.collection,
        q: query.q,
        colour: query.colour?.join(","),
        size: query.size?.join(","),
        season: query.season?.join(","),
        min_price: query.minPrice,
        max_price: query.maxPrice,
        sort: query.sort,
        cursor: query.cursor ?? undefined,
      },
    }),
    () => fixtureProductList(query, locale),
  );
}

export async function getProduct(slug: string, locale: LocaleCode): Promise<ProductDetail | null> {
  try {
    return await liveCatalog(
      () => shopFetch<ProductDetail>(`/products/${slug}`, { locale, revalidate: 300 }),
      () => fixtureProductDetail(slug, locale),
    );
  } catch (error) {
    if (error instanceof ShopApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getRelatedProducts(
  slug: string,
  locale: LocaleCode,
): Promise<ProductCard[]> {
  return liveCatalog(
    () => shopFetch<ProductCard[]>(`/products/${slug}/related`, { locale, revalidate: 600 }),
    () => fixtureRelatedProducts(slug, locale),
  );
}

export async function getReviews(
  slug: string,
  locale: LocaleCode,
  cursor: string | null = null,
): Promise<ReviewListResponse> {
  return liveCatalog(
    () => shopFetch<ReviewListResponse>(`/products/${slug}/reviews`, {
      locale,
      revalidate: 600,
      searchParams: { cursor: cursor ?? undefined },
    }),
    () => fixtureReviews(slug, locale, cursor),
  );
}

/* -------------------------------------------------------------------------- */
/* Merchandising                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Banners come from the admin. An empty array is a real answer — it means the
 * merchandiser has not published anything for this placement — so unlike the
 * menu below, there is no fixture fallback on success. Fixtures only cover the
 * case where the API itself is unreachable.
 */
export async function getBanners(
  placement: BannerPlacement,
  locale: LocaleCode,
): Promise<Banner[]> {
  try {
    return await shopFetch<Banner[]>("/banners", {
      locale,
      revalidate: 600,
      searchParams: { placement },
    });
  } catch (error) {
    if (!USE_FIXTURES || !ALLOW_CATALOG_FALLBACK) throw error;
    return fixtureBanners(placement, locale);
  }
}

export async function getCollection(code: string, locale: LocaleCode): Promise<Collection> {
  return liveCatalog(
    () => shopFetch<Collection>(`/collections/${code}`, { locale, revalidate: 600 }),
    () => fixtureCollection(code, locale),
  );
}

/**
 * Navigation is structural: every page renders the header, so a missing menu
 * must not take the site down. A 404 here means the menu has not been created
 * in the admin yet, and the fixture stands in until it is.
 */
export async function getMenu(code: string, locale: LocaleCode): Promise<Menu> {
  try {
    return await shopFetch<Menu>(`/menus/${code}`, { locale, revalidate: 3600 });
  } catch (error) {
    const missing = error instanceof ShopApiError && error.status === 404;
    if (missing || (USE_FIXTURES && ALLOW_CATALOG_FALLBACK)) {
      return fixtureMenu(code, locale);
    }
    throw error;
  }
}

export async function getPage(slug: string, locale: LocaleCode): Promise<StaticPage | null> {
  try {
    return await shopFetch<StaticPage>(`/pages/${slug}`, { locale, revalidate: 3600 });
  } catch (error) {
    // A missing page is a real 404 for the route, not a reason to serve a
    // fixture that would put demo copy on a live site.
    if (error instanceof ShopApiError && error.status === 404) return null;
    if (!USE_FIXTURES || !ALLOW_CATALOG_FALLBACK) throw error;
    return fixturePage(slug, locale);
  }
}

/**
 * Slugs for `generateStaticParams`. The real endpoint is a lightweight index
 * used only at build time, never on a request path.
 */
export async function getPageSlugs(): Promise<string[]> {
  try {
    return await shopFetch<string[]>("/pages/slugs", { locale: "ar", revalidate: 3600 });
  } catch {
    // Build-time only: an unreachable API must not fail the build.
    if (!USE_FIXTURES || !ALLOW_CATALOG_FALLBACK) return [];
    return fixturePageSlugs();
  }
}

export async function getProductSlugs(): Promise<string[]> {
  return liveCatalog(
    () => shopFetch<string[]>("/products/slugs", { locale: "ar", revalidate: 3600 }),
    () => fixtureProductSlugs(),
  );
}

export async function getStores(locale: LocaleCode): Promise<StoreLocation[]> {
  return liveCatalog(
    () => shopFetch<StoreLocation[]>("/stores", { locale, revalidate: 3600 }),
    () => fixtureStores(locale),
  );
}

/* -------------------------------------------------------------------------- */
/* Checkout reference data                                                    */
/* -------------------------------------------------------------------------- */

export async function getRegions(locale: LocaleCode): Promise<Region[]> {
  return liveCatalog(
    () => shopFetch<Region[]>("/regions", { locale, revalidate: 3600 }),
    () => fixtureRegions(locale),
  );
}

/**
 * Areas, from the same source as the governorates above.
 *
 * This used to short-circuit to fixtures whenever USE_FIXTURES was on, while
 * getRegions read live — so the governorate ids were database rows and the area
 * ids were fixture slugs, nothing ever matched, and the area dropdown was
 * permanently empty. Both now go through liveCatalog against one vocabulary.
 */
export async function getCities(locale: LocaleCode, regionId?: string): Promise<City[]> {
  return liveCatalog(
    () =>
      shopFetch<City[]>("/cities", {
        locale,
        revalidate: 3600,
        searchParams: { region_id: regionId },
      }),
    () => fixtureCities(locale, regionId),
  );
}

export async function getShippingMethods(locale: LocaleCode): Promise<ShippingMethod[]> {
  if (USE_FIXTURES) return fixtureShippingMethods(locale);
  return shopFetch<ShippingMethod[]>("/shipping-methods", { locale, revalidate: 600 });
}

export async function getPaymentMethods(locale: LocaleCode): Promise<PaymentMethod[]> {
  if (USE_FIXTURES) return fixturePaymentMethods(locale);
  return shopFetch<PaymentMethod[]>("/payment-methods", { locale, revalidate: 600 });
}

/* -------------------------------------------------------------------------- */
/* Cart                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The real endpoint takes a cart id from a cookie and returns the server's
 * view. The fixture path rebuilds it from ids the browser persisted — but the
 * arithmetic still happens outside any component, in `mocks/cart-engine.ts`.
 *
 * The *products* behind those ids are fetched live whenever the catalogue is
 * live, even though the totals are still computed by the stand-in engine.
 * Pricing a live catalogue against fixture products would find no match for a
 * real variant and quietly drop the line, which is how a cart ends up empty
 * one click after something was added to it.
 */
export async function getCart(
  stored: StoredLine[],
  locale: LocaleCode,
  couponCode: string | null = null,
  shippingPrice: string | null = null,
): Promise<Cart> {
  if (!USE_FIXTURES) return shopFetch<Cart>("/cart", { locale, revalidate: false });

  const slugs = [...new Set(stored.map((line) => line.productSlug))];
  const resolved = await Promise.all(slugs.map((slug) => getProduct(slug, locale)));
  const bySlug = new Map(slugs.map((slug, index) => [slug, resolved[index]]));

  return fixtureBuildCart(
    stored,
    locale,
    couponCode,
    shippingPrice,
    (slug) => bySlug.get(slug) ?? null,
  );
}

export async function validateCoupon(code: string, locale: LocaleCode): Promise<boolean> {
  if (USE_FIXTURES) return fixtureValidateCoupon(code);
  try {
    await shopFetch("/cart/coupon", { locale, revalidate: false, method: "POST", body: { code } });
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Checkout                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Live stock for the ids the browser is holding.
 *
 * Advisory: it lets the cart correct itself before the shopper commits. The
 * check that actually prevents an oversell is the conditional decrement inside
 * `placeOrder`, which runs in the same transaction as the order insert.
 */
export async function getVariantStock(
  variantIds: number[],
  locale: LocaleCode,
): Promise<VariantStock[]> {
  if (variantIds.length === 0) return [];
  return shopFetch<VariantStock[]>("/stock/check", {
    locale,
    revalidate: false,
    method: "POST",
    body: { variant_ids: variantIds },
  });
}

/**
 * Places the order. Never cached, never retried automatically — a retry after
 * an ambiguous failure could double-charge and double-decrement.
 *
 * Throws ShopApiError with code `insufficient_stock` and a populated `details`
 * when a line cannot be filled; no order is created in that case.
 */
export async function placeOrder(
  input: PlaceOrderInput,
  locale: LocaleCode,
): Promise<PlacedOrder> {
  return shopFetch<PlacedOrder>("/checkout", {
    locale,
    revalidate: false,
    method: "POST",
    body: input,
  });
}

/* -------------------------------------------------------------------------- */
/* Account                                                                    */
/* -------------------------------------------------------------------------- */

export async function getOrders(locale: LocaleCode): Promise<OrderSummary[]> {
  if (USE_FIXTURES) return fixtureOrders(locale);
  return shopFetch<OrderSummary[]>("/account/orders", { locale, revalidate: false });
}

export async function getOrder(
  orderNumber: string,
  locale: LocaleCode,
): Promise<OrderDetail | null> {
  if (USE_FIXTURES) return fixtureOrder(orderNumber, locale);
  return shopFetch<OrderDetail>(`/account/orders/${orderNumber}`, {
    locale,
    revalidate: false,
  });
}

export async function getAddresses(locale: LocaleCode): Promise<Address[]> {
  if (USE_FIXTURES) return fixtureAddresses(locale);
  return shopFetch<Address[]>("/account/addresses", { locale, revalidate: false });
}

export type { ListQuery, StoredLine };
