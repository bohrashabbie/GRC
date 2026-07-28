/**
 * Hand-written mirrors of the backend's Pydantic schemas.
 * Source of truth: http://127.0.0.1:8000/openapi.json — if a shape here drifts
 * from that, the API wins. Keep the field names byte-identical to the API;
 * no camelCase renaming, so a response can be handed straight to a component.
 *
 * Timestamps are ISO 8601 UTC strings, formatted only at display time.
 */

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

/** Every list endpoint is cursor-paginated on (created_at, id). Never offset. */
export type CursorPage<T> = {
  items: T[]
  next_cursor: string | null
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  access_token: string | null
  refresh_token: string | null
  token_type: string
  /**
   * The backend still carries the MFA branch even though CLAUDE.md rule 13
   * disables it. If this ever comes back true, the UI stops with a clear
   * message rather than silently failing — there is no MFA screen.
   */
  mfa_required: boolean
  challenge_token: string | null
}

export type RefreshResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export type UserOut = {
  id: number
  email: string
  full_name: string
  phone_e164: string | null
  is_active: boolean
  mfa_enabled_at: string | null
  last_login_at: string | null
  created_at: string
}

export type UserCreate = {
  email: string
  password: string
  full_name: string
  phone_e164?: string | null
}

export type UserUpdate = {
  full_name?: string | null
  phone_e164?: string | null
  is_active?: boolean | null
}

export type UserListParams = {
  cursor?: string | null
  limit?: number
  is_active?: boolean | null
}

/** GET /users/me — the single source of truth for permission-driven UI. */
export type CurrentUserOut = {
  id: number
  email: string
  full_name: string
  is_active: boolean
  roles: RoleOut[]
  /** Flattened permission keys across every assigned role. */
  permissions: string[]
}

/* -------------------------------------------------------------------------- */
/* Roles & permissions                                                         */
/* -------------------------------------------------------------------------- */

export type RoleOut = {
  id: number
  code: string
  name_ar: string
  name_en: string
  location_id?: number | null
}

export type RoleDetailOut = {
  id: number
  code: string
  name_ar: string
  name_en: string
  description: string | null
  is_system: boolean
  permission_keys: string[]
}

export type PermissionOut = {
  id: number
  key: string
  /** system | catalog | inventory | orders | customers | marketing | finance */
  group: string
  description: string | null
  is_dangerous: boolean
}

export type RolePermissionsUpdate = {
  permission_keys: string[]
}

export type RoleCreate = {
  /** lowercase, starts with a letter, snake_case — enforced by the backend. */
  code: string
  name_ar: string
  name_en: string
  description?: string | null
  permission_keys?: string[]
}

/* -------------------------------------------------------------------------- */
/* Role assignments                                                            */
/* -------------------------------------------------------------------------- */

export type UserRoleAssignmentOut = {
  id: number
  user_id: number
  role_id: number
  role_code: string
  /** Null means the role applies across all locations. */
  location_id: number | null
  granted_by_user_id: number | null
  granted_at: string
  expires_at: string | null
}

export type UserRoleAssignIn = {
  role_id: number
  location_id?: number | null
  expires_at?: string | null
}

/* -------------------------------------------------------------------------- */
/* Translations                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Translations are rows keyed by locale — never JSON blobs, never name_ar /
 * name_en columns (CLAUDE.md rule 9). Slugs are unique per locale.
 */
export type SeoTranslationIn = {
  locale: string
  name: string
  slug?: string | null
  description?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

export type SeoTranslationOut = {
  locale: string
  name: string
  slug: string
  description: string | null
  meta_title: string | null
  meta_description: string | null
}

export type LabelTranslationIn = { locale: string; label: string }
export type LabelTranslationOut = { locale: string; label: string }

export type ProductTranslationIn = {
  locale: string
  name: string
  slug?: string | null
  short_description?: string | null
  description?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

export type ProductTranslationOut = {
  locale: string
  name: string
  slug: string
  short_description: string | null
  description: string | null
  meta_title: string | null
  meta_description: string | null
}

/* -------------------------------------------------------------------------- */
/* Catalog — brands                                                            */
/* -------------------------------------------------------------------------- */

export type BrandOut = {
  id: number
  code: string
  logo_media_id: number | null
  sort_order: number
  is_active: boolean
  created_at: string
  translations: SeoTranslationOut[]
}

export type BrandCreate = {
  code: string
  logo_media_id?: number | null
  sort_order?: number
  is_active?: boolean
  translations: SeoTranslationIn[]
}

export type BrandUpdate = {
  code?: string | null
  logo_media_id?: number | null
  sort_order?: number | null
  is_active?: boolean | null
  translations?: SeoTranslationIn[] | null
}

/* -------------------------------------------------------------------------- */
/* Catalog — categories                                                        */
/* -------------------------------------------------------------------------- */

export type CategoryOut = {
  id: number
  parent_id: number | null
  dimension: string
  path: string
  depth: number
  code: string
  image_media_id: number | null
  /** Resolved storage key for image_media_id, so a preview needs no extra fetch. */
  image_key: string | null
  sort_order: number
  show_in_menu: boolean
  is_active: boolean
  created_at: string
  translations: SeoTranslationOut[]
}

export type CategoryTreeNode = {
  id: number
  code: string
  dimension: string
  depth: number
  sort_order: number
  show_in_menu: boolean
  is_active: boolean
  translations: SeoTranslationOut[]
  children: CategoryTreeNode[]
}

export type CategoryCreate = {
  parent_id?: number | null
  dimension: string
  code: string
  image_media_id?: number | null
  sort_order?: number
  show_in_menu?: boolean
  is_active?: boolean
  translations: SeoTranslationIn[]
}

export type CategoryUpdate = {
  parent_id?: number | null
  dimension?: string | null
  code?: string | null
  image_media_id?: number | null
  sort_order?: number | null
  show_in_menu?: boolean | null
  is_active?: boolean | null
  translations?: SeoTranslationIn[] | null
}

/* -------------------------------------------------------------------------- */
/* Catalog — options & option values                                           */
/* -------------------------------------------------------------------------- */

export type OptionOut = {
  id: number
  code: string
  input_type: string
  is_filterable: boolean
  sort_order: number
  created_at: string
  translations: LabelTranslationOut[]
}

export type OptionCreate = {
  code: string
  input_type: string
  is_filterable?: boolean
  sort_order?: number
  translations: LabelTranslationIn[]
}

export type OptionUpdate = {
  code?: string | null
  input_type?: string | null
  is_filterable?: boolean | null
  sort_order?: number | null
  translations?: LabelTranslationIn[] | null
}

export type OptionValueOut = {
  id: number
  option_id: number
  code: string
  hex_color: string | null
  swatch_media_id: number | null
  sort_order: number
  created_at: string
  translations: LabelTranslationOut[]
}

export type OptionValueCreate = {
  option_id: number
  code: string
  hex_color?: string | null
  swatch_media_id?: number | null
  sort_order?: number
  translations: LabelTranslationIn[]
}

export type OptionValueUpdate = {
  hex_color?: string | null
  swatch_media_id?: number | null
  sort_order?: number | null
  translations?: LabelTranslationIn[] | null
}

/* -------------------------------------------------------------------------- */
/* Catalog — media                                                             */
/* -------------------------------------------------------------------------- */

export type MediaOut = {
  id: number
  storage_key: string
  original_filename: string | null
  mime_type: string
  width_px: number | null
  height_px: number | null
  bytes: number | null
  processing_status: string
  created_at: string
}

export type ProductMediaAttach = {
  product_id: number
  option_value_id?: number | null
  sort_order?: number
  is_primary?: boolean
}

export type ProductMediaOut = {
  id: number
  product_id: number
  media_id: number
  option_value_id: number | null
  sort_order: number
  is_primary: boolean
}

/** Gallery entry with the file inlined, from GET /products/{id}/media. */
export type ProductMediaItemOut = ProductMediaOut & {
  media: MediaOut
}

/* -------------------------------------------------------------------------- */
/* Products & variants                                                         */
/* -------------------------------------------------------------------------- */

/** Money is NUMERIC(12,2) SAR and arrives as a string — never parsed to float
 * for display or arithmetic here; the backend owns all money maths. */
export type ProductOut = {
  id: number
  brand_id: number | null
  product_type: string
  status: string
  default_variant_id: number | null
  base_price: string
  tax_class: string
  is_featured: boolean
  is_best_seller: boolean
  is_on_offer: boolean
  /** False means always purchasable and the stock number is ignored. */
  track_inventory: boolean
  rating_avg: string | null
  rating_count: number
  published_at: string | null
  created_at: string
  translations: ProductTranslationOut[]
  category_ids: number[]
  /** Summed across active variants. Null on responses that do not compute it. */
  stock_quantity: number | null
  /** Worst-of across active variants, so one sold-out size shows on the row. */
  stock_state: StockState | null
  /** Storage key of the primary gallery image, for the list thumbnail. */
  primary_image_key: string | null
}

export type StockState = "in_stock" | "low_stock" | "out_of_stock"

export type ProductCreate = {
  brand_id?: number | null
  product_type: string
  base_price: string
  tax_class?: string
  is_featured?: boolean
  is_best_seller?: boolean
  track_inventory?: boolean
  category_ids?: number[]
  translations: ProductTranslationIn[]
}

export type ProductUpdate = {
  brand_id?: number | null
  product_type?: string | null
  base_price?: string | null
  tax_class?: string | null
  is_featured?: boolean | null
  is_best_seller?: boolean | null
  track_inventory?: boolean | null
  category_ids?: number[] | null
  translations?: ProductTranslationIn[] | null
}

export type ProductListParams = {
  cursor?: string | null
  limit?: number
  q?: string | null
  status?: string | null
  brand_id?: number | null
  product_type?: string | null
  is_featured?: boolean | null
  is_best_seller?: boolean | null
  is_on_offer?: boolean | null
}

export type VariantOut = {
  id: number
  product_id: number
  sku: string
  barcode: string | null
  price: string | null
  compare_at_price: string | null
  cost_price: string | null
  weight_grams: number | null
  low_stock_threshold: number | null
  position: number
  is_active: boolean
  discontinued_at: string | null
  created_at: string
  option_value_ids: number[]
  /** The one stock number, resolved from the default online location. */
  stock_quantity: number
}

export type VariantUpdate = {
  barcode?: string | null
  weight_grams?: number | null
  low_stock_threshold?: number | null
  position?: number | null
  is_active?: boolean | null
  stock_quantity?: number | null
}

/** Every variant's quantity in one request, so a product form save is one
 *  transaction rather than a row-at-a-time trickle. */
export type ProductStockUpdate = {
  items: { variant_id: number; stock_quantity: number }[]
}

export type VariantPriceUpdate = {
  price?: string | null
  compare_at_price?: string | null
  cost_price?: string | null
}

export type VariantCombinationIn = {
  option_value_ids: number[]
  sku?: string | null
  barcode?: string | null
  price?: string | null
  compare_at_price?: string | null
  cost_price?: string | null
  weight_grams?: number | null
}

/** Combinations are explicit, never a full cartesian product, and the backend
 * rejects anything over 300 variants for one product with variant_limit_exceeded. */
export type GenerateVariantsRequest = {
  combinations: VariantCombinationIn[]
}

/* -------------------------------------------------------------------------- */
/* Inventory — locations                                                       */
/* -------------------------------------------------------------------------- */

export type LocationOut = {
  id: number
  code: string
  type: string
  name_ar: string
  name_en: string
  is_sellable_online: boolean
  fulfilment_priority: number
  is_active: boolean
  created_at: string
}

export type LocationCreate = {
  code: string
  type: string
  name_ar: string
  name_en: string
  is_sellable_online?: boolean
  fulfilment_priority?: number
  is_active?: boolean
}

export type LocationUpdate = {
  name_ar?: string | null
  name_en?: string | null
  is_sellable_online?: boolean | null
  fulfilment_priority?: number | null
  is_active?: boolean | null
}

/* -------------------------------------------------------------------------- */
/* Inventory — stock                                                           */
/* -------------------------------------------------------------------------- */

export type StockLevelOut = {
  variant_id: number
  location_id: number
  on_hand: number
  reserved: number
  incoming: number
  safety_stock: number
  available: number
  updated_at: string
}

export type StockAdjustRequest = {
  variant_id: number
  location_id: number
  qty_delta: number
  note: string
}

export type StockMovementOut = {
  id: number
  variant_id: number
  location_id: number
  qty_delta: number
  reason: string
  ref_type: string | null
  ref_id: number | null
  unit_cost: string | null
  balance_after: number | null
  actor_user_id: number | null
  note: string | null
  created_at: string
}

/* -------------------------------------------------------------------------- */
/* Inventory — transfers                                                       */
/* -------------------------------------------------------------------------- */

export type TransferItemOut = {
  id: number
  variant_id: number
  qty_requested: number
  qty_dispatched: number
  qty_received: number
}

export type TransferOut = {
  id: number
  transfer_number: string
  from_location_id: number
  to_location_id: number
  status: string
  created_by_user_id: number
  dispatched_at: string | null
  received_at: string | null
  note: string | null
  created_at: string
  items: TransferItemOut[]
}

export type TransferCreate = {
  from_location_id: number
  to_location_id: number
  note?: string | null
  items: { variant_id: number; qty_requested: number }[]
}

export type TransferDispatchRequest = {
  items?: { item_id: number; qty_dispatched?: number | null }[]
}

export type TransferReceiveRequest = {
  items: { item_id: number; qty_received: number }[]
}

/* -------------------------------------------------------------------------- */
/* Inventory — stock counts                                                    */
/* -------------------------------------------------------------------------- */

export type StockCountItemOut = {
  id: number
  variant_id: number
  system_qty: number
  counted_qty: number | null
  variance: number | null
  counted_by_user_id: number | null
  counted_at: string | null
}

export type StockCountOut = {
  id: number
  count_number: string
  location_id: number
  scope: string
  status: string
  started_by_user_id: number
  approved_by_user_id: number | null
  started_at: string
  applied_at: string | null
  items: StockCountItemOut[]
}

export type StockCountCreate = {
  location_id: number
  scope: string
  scope_filter?: Record<string, unknown> | null
  variant_ids: number[]
}

export type StockCountRecordRequest = {
  items: { item_id: number; counted_qty: number }[]
}

/* -------------------------------------------------------------------------- */
/* Purchasing — suppliers                                                      */
/* -------------------------------------------------------------------------- */

export type SupplierOut = {
  id: number
  code: string
  name: string
  contact_name: string | null
  email: string | null
  phone_e164: string | null
  address: string | null
  vat_number: string | null
  currency: string
  payment_terms_days: number | null
  default_lead_time_days: number | null
  is_active: boolean
  created_at: string
}

export type SupplierCreate = {
  code: string
  name: string
  contact_name?: string | null
  email?: string | null
  phone_e164?: string | null
  address?: string | null
  vat_number?: string | null
  currency?: string
  payment_terms_days?: number | null
  default_lead_time_days?: number | null
  is_active?: boolean
}

export type SupplierUpdate = Omit<Partial<SupplierCreate>, "code" | "currency">

/* -------------------------------------------------------------------------- */
/* Purchasing — purchase orders & goods receipts                               */
/* -------------------------------------------------------------------------- */

export type PurchaseOrderItemOut = {
  id: number
  variant_id: number
  qty_ordered: number
  qty_received: number
  unit_cost: string
  line_total: string
}

export type PurchaseOrderOut = {
  id: number
  po_number: string
  supplier_id: number
  destination_location_id: number
  status: string
  currency: string
  exchange_rate: string | null
  subtotal: string
  tax_total: string
  shipping_cost: string
  total: string
  expected_at: string | null
  created_by_user_id: number
  approved_by_user_id: number | null
  approved_at: string | null
  created_at: string
  items: PurchaseOrderItemOut[]
}

export type PurchaseOrderCreate = {
  supplier_id: number
  destination_location_id: number
  currency?: string
  exchange_rate?: string | null
  tax_total?: string
  shipping_cost?: string
  expected_at?: string | null
  items: { variant_id: number; qty_ordered: number; unit_cost: string }[]
}

export type GoodsReceiptItemOut = {
  id: number
  purchase_order_item_id: number | null
  variant_id: number
  qty: number
  qty_rejected: number
  unit_cost: string | null
}

export type GoodsReceiptOut = {
  id: number
  receipt_number: string
  purchase_order_id: number | null
  location_id: number
  supplier_invoice_number: string | null
  received_by_user_id: number
  received_at: string
  note: string | null
  items: GoodsReceiptItemOut[]
}

export type GoodsReceiptCreate = {
  purchase_order_id?: number | null
  location_id: number
  supplier_invoice_number?: string | null
  note?: string | null
  items: {
    purchase_order_item_id?: number | null
    variant_id: number
    qty: number
    qty_rejected?: number
    unit_cost?: string | null
  }[]
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

export type OrderAddressOut = {
  type: string
  recipient_name: string
  phone_e164: string
  line1: string
  line2: string | null
  district: string | null
  city: string
  region_name: string
  postal_code: string | null
  country_code: string
}

/** Everything here is snapshotted at purchase time — never re-derived by
 * joining live catalog tables (CLAUDE.md rule 7). */
export type OrderItemOut = {
  id: number
  variant_id: number
  product_id: number
  sku_snapshot: string
  name_snapshot: string
  options_snapshot: Record<string, unknown>
  unit_price_snapshot: string
  tax_rate_snapshot: string
  qty: number
  qty_fulfilled: number
  qty_returned: number
  line_total: string
}

export type OrderNoteOut = {
  id: number
  author_user_id: number | null
  body: string
  is_customer_visible: boolean
  created_at: string
}

export type PaymentOut = {
  id: number
  provider: string
  method: string | null
  amount: string
  currency: string
  status: string
  captured_at: string | null
  created_at: string
  /** Sum of succeeded refunds; amount - refunded_amount is still refundable. */
  refunded_amount: string
}

export type OrderOut = {
  id: number
  order_number: string
  customer_id: number | null
  email: string | null
  phone_e164: string | null
  status: string
  payment_status: string
  fulfilment_status: string
  currency: string
  subtotal: string
  discount_total: string
  shipping_total: string
  tax_total: string
  grand_total: string
  locale: string
  placed_at: string
  cancelled_at: string | null
  cancel_reason: string | null
  items: OrderItemOut[]
  addresses: OrderAddressOut[]
  notes: OrderNoteOut[]
  payments: PaymentOut[]
}

export type OrderListParams = {
  cursor?: string | null
  limit?: number
  status?: string | null
  payment_status?: string | null
  fulfilment_status?: string | null
  customer_id?: number | null
}

export type OrderStatusField =
  | "status"
  | "payment_status"
  | "fulfilment_status"

export type OrderStatusUpdate = {
  field: OrderStatusField
  to_value: string
  reason?: string | null
}

export type OrderNoteIn = {
  body: string
  is_customer_visible?: boolean
}

export type RefundRequest = {
  payment_id: number
  amount: string
  reason?: string | null
}

export type PaymentRefundOut = {
  id: number
  payment_id: number
  order_id: number
  amount: string
  reason: string | null
  status: string
  created_by_user_id: number
  created_at: string
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                   */
/* -------------------------------------------------------------------------- */

export type CustomerOut = {
  id: number
  email: string | null
  phone_e164: string | null
  first_name: string | null
  last_name: string | null
  locale_pref: string
  accepts_marketing: boolean
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export type CustomerUpdate = {
  first_name?: string | null
  last_name?: string | null
  locale_pref?: string | null
  accepts_marketing?: boolean | null
  is_active?: boolean | null
}

export type CustomerAddressOut = {
  id: number
  customer_id: number
  label: string | null
  recipient_name: string
  phone_e164: string
  line1: string
  line2: string | null
  district: string | null
  city: string
  region_id: number
  postal_code: string | null
  country_code: string
  is_default_shipping: boolean
  is_default_billing: boolean
  created_at: string
}

export type CustomerAddressCreate = {
  label?: string | null
  recipient_name: string
  phone_e164: string
  line1: string
  line2?: string | null
  district?: string | null
  city: string
  region_id: number
  postal_code?: string | null
  country_code?: string
  national_short_address?: string | null
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

export type CustomerAddressUpdate = Partial<
  Omit<CustomerAddressCreate, "country_code" | "national_short_address">
>

/* -------------------------------------------------------------------------- */
/* System — settings & audit                                                   */
/* -------------------------------------------------------------------------- */

export type SettingValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[]

export type SettingOut = {
  key: string
  value: SettingValue
  group: string
  is_public: boolean
  updated_by_user_id: number | null
  updated_at: string
}

export type SettingUpdate = {
  value: SettingValue
  group?: string | null
  is_public?: boolean | null
}

/** Only the changed fields land in before_json/after_json — never a full-row
 * snapshot — so the diff view shows exactly what moved. */
export type AuditLogOut = {
  id: number
  actor_user_id: number | null
  actor_type: string
  action: string
  entity_type: string
  entity_id: number | null
  before_json: Record<string, unknown> | null
  after_json: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

export type AuditListParams = {
  cursor?: string | null
  limit?: number
  entity_type?: string | null
  actor_user_id?: number | null
  action?: string | null
  date_from?: string | null
  date_to?: string | null
}

/* -------------------------------------------------------------------------- */
/* CMS — banners, menus, pages                                                 */
/* -------------------------------------------------------------------------- */

export type BannerPlacement =
  | "home_hero"
  | "home_promo"
  | "category_top"
  | "checkout_strip"

export type BannerLinkType = "category" | "product" | "collection" | "url"

export type BannerTranslationIn = {
  locale: string
  headline?: string | null
  subheadline?: string | null
  cta_label?: string | null
  alt_text?: string | null
}

export type BannerTranslationOut = BannerTranslationIn

export type BannerOut = {
  id: number
  placement: BannerPlacement
  media_desktop_id: number | null
  media_mobile_id: number | null
  /** Resolved storage keys, so the edit form can show existing artwork. */
  media_desktop_key: string | null
  media_mobile_key: string | null
  link_type: BannerLinkType | null
  link_target_id: number | null
  link_url: string | null
  starts_at: string | null
  ends_at: string | null
  sort_order: number
  is_active: boolean
  text_theme: "light" | "dark"
  translations: BannerTranslationOut[]
}

export type BannerCreate = {
  placement: BannerPlacement
  media_desktop_id?: number | null
  media_mobile_id?: number | null
  link_type?: BannerLinkType | null
  link_target_id?: number | null
  link_url?: string | null
  starts_at?: string | null
  ends_at?: string | null
  sort_order?: number
  is_active?: boolean
  text_theme?: "light" | "dark"
  translations: BannerTranslationIn[]
}

export type BannerUpdate = Partial<Omit<BannerCreate, "translations">> & {
  translations?: BannerTranslationIn[] | null
}

export type MenuLinkType = "category" | "brand" | "collection" | "page" | "url"

export type MenuItemOut = {
  id: number
  menu_id: number
  parent_id: number | null
  link_type: MenuLinkType
  link_target_id: number | null
  link_url: string | null
  icon_media_id: number | null
  badge_code: string | null
  sort_order: number
  is_active: boolean
  translations: LabelTranslationOut[]
}

export type MenuItemCreate = {
  parent_id?: number | null
  link_type: MenuLinkType
  link_target_id?: number | null
  link_url?: string | null
  icon_media_id?: number | null
  badge_code?: string | null
  sort_order?: number
  is_active?: boolean
  translations: LabelTranslationIn[]
}

export type MenuItemUpdate = Partial<Omit<MenuItemCreate, "translations">> & {
  translations?: LabelTranslationIn[] | null
}

export type MenuOut = {
  id: number
  code: string
  is_active: boolean
  items: MenuItemOut[]
}

export type MenuCreate = { code: string; is_active?: boolean }
export type MenuUpdate = { code?: string | null; is_active?: boolean | null }

export type PageStatus = "draft" | "published"
export type PageTemplate = "default" | "full_width" | "contact"

export type PageTranslationIn = {
  locale: string
  title: string
  slug?: string | null
  body?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

export type PageTranslationOut = {
  locale: string
  title: string
  slug: string
  body: string | null
  meta_title: string | null
  meta_description: string | null
}

export type PageOut = {
  id: number
  code: string
  template: PageTemplate
  status: PageStatus
  published_at: string | null
  translations: PageTranslationOut[]
}

export type PageCreate = {
  code: string
  template?: PageTemplate
  status?: PageStatus
  translations: PageTranslationIn[]
}

export type PageUpdate = Partial<Omit<PageCreate, "translations">> & {
  translations?: PageTranslationIn[] | null
}
