import type {
  AuditListParams,
  OrderListParams,
  ProductListParams,
  UserListParams,
} from "@/lib/api/types"

/**
 * One registry for every query key, so invalidation after a mutation can't
 * silently miss a cache entry because two files spelled a key differently.
 */
export const queryKeys = {
  currentUser: ["current-user"] as const,

  users: {
    all: ["users"] as const,
    list: (params: Pick<UserListParams, "is_active">) =>
      ["users", "list", params] as const,
    detail: (userId: number) => ["users", "detail", userId] as const,
    roles: (userId: number) => ["users", "roles", userId] as const,
  },

  roles: {
    all: ["roles"] as const,
    list: () => ["roles", "list"] as const,
    detail: (roleId: number) => ["roles", "detail", roleId] as const,
    permissions: () => ["roles", "permissions"] as const,
  },

  brands: {
    all: ["brands"] as const,
    list: (params: { is_active?: boolean | null }) =>
      ["brands", "list", params] as const,
    detail: (brandId: number) => ["brands", "detail", brandId] as const,
  },

  categories: {
    all: ["categories"] as const,
    list: (params: { dimension?: string | null; is_active?: boolean | null }) =>
      ["categories", "list", params] as const,
    tree: (dimension?: string | null) =>
      ["categories", "tree", dimension ?? null] as const,
    detail: (categoryId: number) => ["categories", "detail", categoryId] as const,
  },

  options: {
    all: ["options"] as const,
    list: () => ["options", "list"] as const,
    detail: (optionId: number) => ["options", "detail", optionId] as const,
    values: (optionId: number) => ["options", "values", optionId] as const,
  },

  products: {
    all: ["products"] as const,
    list: (params: Omit<ProductListParams, "cursor" | "limit">) =>
      ["products", "list", params] as const,
    detail: (productId: number) => ["products", "detail", productId] as const,
    variants: (productId: number) => ["products", "variants", productId] as const,
    media: (productId: number) => ["products", "media", productId] as const,
  },

  locations: {
    all: ["locations"] as const,
    list: (params: { type?: string | null; is_active?: boolean | null } = {}) =>
      ["locations", "list", params] as const,
    detail: (locationId: number) => ["locations", "detail", locationId] as const,
  },

  suppliers: {
    all: ["suppliers"] as const,
    list: (params: { is_active?: boolean | null }) =>
      ["suppliers", "list", params] as const,
    detail: (supplierId: number) => ["suppliers", "detail", supplierId] as const,
  },

  purchaseOrders: {
    all: ["purchase-orders"] as const,
    detail: (poId: number) => ["purchase-orders", "detail", poId] as const,
  },

  goodsReceipts: {
    all: ["goods-receipts"] as const,
    detail: (receiptId: number) => ["goods-receipts", "detail", receiptId] as const,
  },

  orders: {
    all: ["orders"] as const,
    list: (params: Omit<OrderListParams, "cursor" | "limit">) =>
      ["orders", "list", params] as const,
    detail: (orderId: number) => ["orders", "detail", orderId] as const,
  },

  customers: {
    all: ["customers"] as const,
    list: (params: { is_active?: boolean | null }) =>
      ["customers", "list", params] as const,
    detail: (customerId: number) => ["customers", "detail", customerId] as const,
    addresses: (customerId: number) =>
      ["customers", "addresses", customerId] as const,
  },

  settings: {
    all: ["settings"] as const,
    list: (group?: string | null) => ["settings", "list", group ?? null] as const,
  },

  banners: {
    all: ["banners"] as const,
    list: (params: { placement?: string | null; is_active?: boolean | null }) =>
      ["banners", "list", params] as const,
    detail: (bannerId: number) => ["banners", "detail", bannerId] as const,
  },

  menus: {
    all: ["menus"] as const,
    list: () => ["menus", "list"] as const,
    detail: (menuId: number) => ["menus", "detail", menuId] as const,
  },

  pages: {
    all: ["pages"] as const,
    list: (params: { status?: string | null }) =>
      ["pages", "list", params] as const,
    detail: (pageId: number) => ["pages", "detail", pageId] as const,
  },

  audit: {
    all: ["audit"] as const,
    list: (params: Omit<AuditListParams, "cursor" | "limit">) =>
      ["audit", "list", params] as const,
  },
} as const
