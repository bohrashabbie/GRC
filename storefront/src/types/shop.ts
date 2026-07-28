/**
 * The `/shop/v1` response contract.
 *
 * NOTE: none of these endpoints exist yet. This file is the storefront's
 * *proposal* for them, written first so the UI is built against a real shape
 * instead of ad-hoc guesses scattered through components. When the backend is
 * built, this file is the thing to reconcile against it — a mismatch here
 * should be fixed in one place, not in twenty call sites.
 *
 * Conventions carried over from the admin API:
 *  - Money is a decimal STRING ("349.00"), never a number. Preserves the
 *    NUMERIC(12,2) precision the backend guarantees.
 *  - Lists are cursor-paginated: `{ items, next_cursor }`. Never offset.
 *  - Errors are `{ code, message, details }`.
 *  - Translated text is already resolved to the requested locale by the
 *    server (via an `Accept-Language` header or `?locale=`); the storefront
 *    never receives raw `*_translations` rows.
 */

export type Money = string;
export type LocaleCode = "ar" | "en";

export interface Paginated<T> {
  items: T[];
  next_cursor: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
}

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

export interface MediaImage {
  id: string;
  /** Base URL; widths below are the renditions the backend has generated. */
  url: string;
  alt: string | null;
  width: number;
  height: number;
  /** e.g. [320, 640, 960, 1440] — drives the `srcset` we build. */
  available_widths: number[];
  /** Tiny blurred placeholder, base64. Optional but wanted for LCP images. */
  blur_data_url: string | null;
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  /** Circular homepage tile / mega-menu thumbnail. */
  image: MediaImage | null;
  product_count: number;
  children: CategoryNode[];
}

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

/** Availability is resolved server-side from on_hand - reserved - safety_stock. */
export type StockState = "in_stock" | "low_stock" | "out_of_stock";

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  brand: { id: string; slug: string; name: string } | null;
  primary_image: MediaImage | null;
  /** Second image, revealed on hover. Null if the product has only one. */
  hover_image: MediaImage | null;
  price: Money;
  /** Struck-through original. Null when not on sale. */
  compare_at_price: Money | null;
  stock_state: StockState;
  /** Distinct colour options, for the swatch row on the card. */
  colour_swatches: ColourSwatch[];
  badges: ProductBadge[];
}

export interface ColourSwatch {
  option_value_id: string;
  name: string;
  /** Hex, or null when the swatch is represented by a fabric image instead. */
  hex: string | null;
  image: MediaImage | null;
}

export type ProductBadge = "new" | "best_seller" | "sale" | "limited";

export interface ProductOption {
  id: string;
  code: string;
  name: string;
  input_type: "swatch" | "button" | "dropdown";
  values: ProductOptionValue[];
}

export interface ProductOptionValue {
  id: string;
  name: string;
  hex: string | null;
  image: MediaImage | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: Money;
  compare_at_price: Money | null;
  stock_state: StockState;
  /**
   * The real remaining quantity, so the stepper has a ceiling to clamp to.
   * Null means genuinely uncapped — a product with inventory tracking off.
   */
  available_quantity: number | null;
  /** option_id -> option_value_id. The full coordinate of this variant. */
  option_values: Record<string, string>;
}

export interface ProductAttribute {
  code: string;
  name: string;
  value: string;
  group: string | null;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description_html: string;
  brand: { id: string; slug: string; name: string } | null;
  breadcrumbs: { slug: string; name: string }[];
  options: ProductOption[];
  variants: ProductVariant[];
  /**
   * Gallery images. `option_value_id` ties an image to a colour so the gallery
   * can filter when a colour is picked; null means "shows for every colour".
   */
  media: (MediaImage & { option_value_id: string | null })[];
  attributes: ProductAttribute[];
  price_range: { min: Money; max: Money };
  rating: { average: number; count: number } | null;
  /** Pre-rendered JSON-LD Product node, so structured data can't drift. */
  seo: SeoMeta;
}

/* -------------------------------------------------------------------------- */
/* Listing / facets                                                           */
/* -------------------------------------------------------------------------- */

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  hex: string | null;
}

export interface Facet {
  code: string;
  label: string;
  type: "swatch" | "checkbox" | "range";
  values: FacetValue[];
  /** Populated only when `type` is "range". */
  range: { min: Money; max: Money } | null;
}

export interface ProductListResponse extends Paginated<ProductCard> {
  facets: Facet[];
  total_count: number;
  applied: Record<string, string[]>;
}

/* -------------------------------------------------------------------------- */
/* Merchandising: banners, collections, menus, pages                          */
/* -------------------------------------------------------------------------- */

export type BannerPlacement = "home_hero";

export interface Banner {
  id: string;
  placement: BannerPlacement;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  /** Separate art per breakpoint — a 21:9 hero crop is unusable on mobile. */
  desktop_image: MediaImage;
  mobile_image: MediaImage | null;
  /** Overlay text colour, chosen by the merchandiser against the artwork. */
  text_theme: "light" | "dark";
  sort_order: number;
}

export interface Collection {
  id: string;
  code: string;
  title: string;
  subtitle: string | null;
  /** The collection's own listing page, e.g. `/collections/best_sellers`. */
  href: string | null;
  /** How many products are in the collection, not just the rail's slice. */
  total_count?: number;
  /** The rail's slice — the first handful, not the whole collection. */
  products: ProductCard[];
}

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  children: MenuItem[];
}

export interface Menu {
  code: string;
  title: string;
  items: MenuItem[];
}

export interface StaticPage {
  slug: string;
  title: string;
  body_html: string;
  updated_at: string;
  seo: SeoMeta;
}

/* -------------------------------------------------------------------------- */
/* Store locator                                                              */
/* -------------------------------------------------------------------------- */

export interface StoreLocation {
  id: string;
  name: string;
  city: string;
  address_line: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  accepts_returns: boolean;
  opening_hours: { day: number; opens: string; closes: string }[];
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  created_at: string;
  /** Set when the reviewer actually bought this product — drives the badge. */
  is_verified_purchase: boolean;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** Star value (1-5) -> how many reviews gave it. */
  distribution: Record<string, number>;
}

export interface ReviewListResponse extends Paginated<Review> {
  summary: ReviewSummary;
}

/* -------------------------------------------------------------------------- */
/* Cart                                                                       */
/* -------------------------------------------------------------------------- */

export interface CartLine {
  id: string;
  variant_id: string;
  product_slug: string;
  name: string;
  /** Resolved option names, e.g. "Ivory · 56". Snapshot, not a live join. */
  options_label: string | null;
  sku: string;
  image: MediaImage | null;
  quantity: number;
  unit_price: Money;
  line_total: Money;
  compare_at_unit_price: Money | null;
  stock_state: StockState;
  /** Set when the requested quantity exceeds what is actually available. */
  max_quantity: number | null;
}

/**
 * Every figure below is computed server-side. The storefront renders these
 * verbatim and never sums lines, applies VAT, or evaluates the free-shipping
 * threshold itself.
 */
export interface CartTotals {
  subtotal: Money;
  discount_total: Money;
  shipping_total: Money;
  /** VAT already included in the customer-facing prices, shown for clarity. */
  tax_total: Money;
  grand_total: Money;
  /** Null once the threshold is met. */
  free_shipping_remaining: Money | null;
  free_shipping_threshold: Money;
}

export interface AppliedCoupon {
  code: string;
  label: string;
  discount_amount: Money;
}

export interface Cart {
  id: string;
  lines: CartLine[];
  totals: CartTotals;
  coupon: AppliedCoupon | null;
  item_count: number;
}

/* -------------------------------------------------------------------------- */
/* Checkout                                                                   */
/* -------------------------------------------------------------------------- */

export interface Region {
  id: string;
  name: string;
}

/** An area within a governorate. `region_id` is the governorate slug. */
export interface City {
  id: string;
  region_id: string;
  name: string;
}

/**
 * A Kuwaiti delivery address: Governorate -> Area -> Block -> Street ->
 * Building. Kuwait uses no postal code for delivery and has no equivalent of
 * the Saudi National Address short code, so neither is collected.
 *
 * `governorate_id` and `area_id` are slugs from /regions and /cities. Both
 * dropdowns read the same vocabulary, which is what keeps the area list from
 * coming back empty for a selected governorate.
 */
export interface Address {
  id: string;
  full_name: string;
  phone: string;
  governorate_id: string;
  governorate_name: string;
  area_id: string;
  area_name: string;
  block: string;
  street: string;
  building: string;
  /** Floor, flat number or landmark directions — one free-text line. */
  extra_directions: string | null;
  is_default: boolean;
}

export type AddressInput = Omit<
  Address,
  "id" | "governorate_name" | "area_name"
>;

export interface ShippingMethod {
  id: string;
  name: string;
  description: string | null;
  price: Money;
  /** Null when the method has no promised window (e.g. store pickup). */
  estimated_days: { min: number; max: number } | null;
  carrier_name: string | null;
}

export type PaymentMethodCode = "mada" | "card" | "apple_pay" | "tamara" | "cod";

export interface PaymentMethod {
  code: PaymentMethodCode;
  name: string;
  description: string | null;
  /** Extra fee, e.g. cash on delivery. Already VAT-inclusive. */
  surcharge: Money | null;
  is_available: boolean;
}

export interface CheckoutSession {
  id: string;
  cart: Cart;
  email: string | null;
  shipping_address: Address | null;
  shipping_method_id: string | null;
  payment_method_code: PaymentMethodCode | null;
  available_shipping_methods: ShippingMethod[];
  available_payment_methods: PaymentMethod[];
}

export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed";

export interface PaymentResult {
  status: PaymentStatus;
  order_number: string | null;
  /** Present when a gateway needs a redirect. Stubbed backend returns null. */
  redirect_url: string | null;
  failure_reason: string | null;
}

/** What the browser may assert about an order: ids and quantities, never money. */
export interface PlaceOrderInput {
  lines: { variant_id: number; quantity: number }[];
  email: string;
  shipping_address: {
    full_name: string;
    phone: string;
    governorate_id: string;
    area_id: string;
    block: string;
    street: string;
    building: string;
    extra_directions: string | null;
  };
  shipping_method_id: string;
  payment_method_code: PaymentMethodCode;
}

export interface PlacedOrder {
  order_number: string;
  status: string;
  payment_status: string;
  email: string | null;
  totals: {
    subtotal: Money;
    discount_total: Money;
    shipping_total: Money;
    tax_total: Money;
    grand_total: Money;
  };
}

/**
 * The shape the API returns in `details` on a 409 insufficient_stock, so the
 * cart can say "only N left" against the right line rather than showing a
 * generic failure.
 */
export interface InsufficientStock {
  variant_id: number;
  variant_name: string;
  requested: number;
  available: number;
}

/** Live availability for a set of variants, re-read just before submit. */
export interface VariantStock {
  variant_id: number;
  quantity: number;
  stock_state: StockState;
  /** Null when the product is not inventory-tracked — no ceiling at all. */
  max_quantity: number | null;
}

/* -------------------------------------------------------------------------- */
/* Customer account                                                           */
/* -------------------------------------------------------------------------- */

export interface Customer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

/** Counts behind each card on the account landing page. */
export interface AccountSummary {
  order_count: number;
  wishlist_count: number;
  address_count: number;
}

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string | null;
  locale?: string;
  accepts_marketing?: boolean;
}

/**
 * The token comes back in the body so a Server Action can put it in an
 * httpOnly cookie. It is never exposed to browser JavaScript.
 */
export interface CustomerSession {
  token: string;
  customer: Customer;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export interface OrderStatusEvent {
  status: OrderStatus;
  occurred_at: string;
  note: string | null;
}

export interface OrderLine {
  id: string;
  /** Snapshots — these never join back to live catalogue rows. */
  name_snapshot: string;
  sku_snapshot: string;
  options_snapshot: string | null;
  unit_price_snapshot: Money;
  quantity: number;
  line_total: Money;
  image: MediaImage | null;
  /** Null if the product has since been removed from the catalogue. */
  product_slug: string | null;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: OrderStatus;
  placed_at: string;
  item_count: number;
  grand_total: Money;
}

export interface OrderDetail extends OrderSummary {
  lines: OrderLine[];
  totals: CartTotals;
  shipping_address: Address;
  shipping_method_name: string;
  payment_method_name: string;
  timeline: OrderStatusEvent[];
  tracking_number: string | null;
  tracking_url: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface WishlistItem {
  id: string;
  product: ProductCard;
  added_at: string;
}

/* -------------------------------------------------------------------------- */
/* SEO                                                                        */
/* -------------------------------------------------------------------------- */

export interface SeoMeta {
  title: string;
  description: string;
  canonical_path: string;
  /** locale -> path, for hreflang alternates. */
  alternates: Record<LocaleCode, string>;
  /** JSON-LD, serialised server-side and injected verbatim. */
  json_ld: Record<string, unknown> | null;
}
