import { api, apiUpload } from "./client"
import type {
  AuditListParams,
  AuditLogOut,
  BrandCreate,
  BrandOut,
  BrandUpdate,
  CategoryCreate,
  CategoryOut,
  CategoryTreeNode,
  CategoryUpdate,
  CurrentUserOut,
  CursorPage,
  CustomerAddressCreate,
  CustomerAddressOut,
  CustomerAddressUpdate,
  CustomerOut,
  CustomerUpdate,
  GenerateVariantsRequest,
  GoodsReceiptCreate,
  GoodsReceiptOut,
  LocationCreate,
  LocationOut,
  LocationUpdate,
  MediaOut,
  OptionCreate,
  OptionOut,
  OptionUpdate,
  OptionValueCreate,
  OptionValueOut,
  OptionValueUpdate,
  OrderListParams,
  OrderNoteIn,
  OrderNoteOut,
  OrderOut,
  OrderStatusUpdate,
  PaymentRefundOut,
  PermissionOut,
  ProductCreate,
  ProductListParams,
  ProductMediaAttach,
  ProductMediaItemOut,
  ProductMediaOut,
  ProductOut,
  ProductUpdate,
  PurchaseOrderCreate,
  PurchaseOrderOut,
  RefundRequest,
  RoleCreate,
  RoleDetailOut,
  SettingOut,
  SettingUpdate,
  StockAdjustRequest,
  StockCountCreate,
  StockCountOut,
  StockCountRecordRequest,
  StockLevelOut,
  StockMovementOut,
  SupplierCreate,
  SupplierOut,
  SupplierUpdate,
  TransferCreate,
  TransferDispatchRequest,
  TransferOut,
  TransferReceiveRequest,
  UserCreate,
  UserListParams,
  UserOut,
  UserRoleAssignIn,
  UserRoleAssignmentOut,
  UserUpdate,
  VariantOut,
  VariantPriceUpdate,
  VariantUpdate,
  BannerOut,
  BannerCreate,
  BannerUpdate,
  MenuOut,
  MenuCreate,
  MenuUpdate,
  MenuItemOut,
  MenuItemCreate,
  MenuItemUpdate,
  PageOut,
  PageCreate,
  PageUpdate,
} from "./types"

/**
 * One thin typed function per backend route. No caching, no react-query here —
 * hooks compose these. Paths are relative to NEXT_PUBLIC_API_BASE_URL (/api/v1).
 */

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const authApi = {
  /**
   * NOTE: the backend has no GET /auth/me — the current-user endpoint lives at
   * GET /users/me and returns roles + flattened permission keys.
   */
  me: () => api.get<CurrentUserOut>("/users/me"),
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export const usersApi = {
  list: (params: UserListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<UserOut>>("/users", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        is_active: params.is_active ?? undefined,
      },
      signal,
    }),

  get: (userId: number, signal?: AbortSignal) =>
    api.get<UserOut>(`/users/${userId}`, { signal }),

  create: (payload: UserCreate) => api.post<UserOut>("/users", payload),

  update: (userId: number, payload: UserUpdate) =>
    api.patch<UserOut>(`/users/${userId}`, payload),

  /** Soft-deactivate. The backend never hard-deletes a user (CLAUDE.md rule 4). */
  deactivate: (userId: number) => api.del(`/users/${userId}`),

  listRoles: (userId: number, signal?: AbortSignal) =>
    api.get<UserRoleAssignmentOut[]>(`/users/${userId}/roles`, { signal }),

  assignRole: (userId: number, payload: UserRoleAssignIn) =>
    api.post<UserRoleAssignmentOut>(`/users/${userId}/roles`, payload),

  revokeRole: (userId: number, userRoleId: number) =>
    api.del(`/users/${userId}/roles/${userRoleId}`),
}

/* -------------------------------------------------------------------------- */
/* Roles                                                                       */
/* -------------------------------------------------------------------------- */

export const rolesApi = {
  /** Returns full detail including permission_keys — no per-role fetch needed. */
  list: (signal?: AbortSignal) =>
    api.get<RoleDetailOut[]>("/roles", { signal }),

  get: (roleId: number, signal?: AbortSignal) =>
    api.get<RoleDetailOut>(`/roles/${roleId}`, { signal }),

  /** The full catalog of permission keys, grouped. */
  permissions: (signal?: AbortSignal) =>
    api.get<PermissionOut[]>("/roles/permissions", { signal }),

  /** Replaces the role's permission set wholesale. */
  setPermissions: (roleId: number, permissionKeys: string[]) =>
    api.patch<RoleDetailOut>(`/roles/${roleId}/permissions`, {
      permission_keys: permissionKeys,
    }),

  create: (payload: RoleCreate) => api.post<RoleDetailOut>("/roles", payload),
}

/* -------------------------------------------------------------------------- */
/* Catalog — brands                                                            */
/* -------------------------------------------------------------------------- */

export const brandsApi = {
  list: (
    params: { cursor?: string | null; limit?: number; is_active?: boolean | null } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<BrandOut>>("/brands", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        is_active: params.is_active ?? undefined,
      },
      signal,
    }),
  get: (brandId: number, signal?: AbortSignal) =>
    api.get<BrandOut>(`/brands/${brandId}`, { signal }),
  create: (payload: BrandCreate) => api.post<BrandOut>("/brands", payload),
  update: (brandId: number, payload: BrandUpdate) =>
    api.patch<BrandOut>(`/brands/${brandId}`, payload),
  /** Soft-delete: sets is_active false, never removes the row. */
  deactivate: (brandId: number) => api.del(`/brands/${brandId}`),
}

/* -------------------------------------------------------------------------- */
/* Catalog — categories                                                        */
/* -------------------------------------------------------------------------- */

export const categoriesApi = {
  list: (
    params: {
      cursor?: string | null
      limit?: number
      dimension?: string | null
      is_active?: boolean | null
    } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<CategoryOut>>("/categories", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        dimension: params.dimension ?? undefined,
        is_active: params.is_active ?? undefined,
      },
      signal,
    }),
  tree: (dimension?: string | null, signal?: AbortSignal) =>
    api.get<CategoryTreeNode[]>("/categories/tree", {
      query: { dimension: dimension ?? undefined },
      signal,
    }),
  get: (categoryId: number, signal?: AbortSignal) =>
    api.get<CategoryOut>(`/categories/${categoryId}`, { signal }),
  create: (payload: CategoryCreate) =>
    api.post<CategoryOut>("/categories", payload),
  update: (categoryId: number, payload: CategoryUpdate) =>
    api.patch<CategoryOut>(`/categories/${categoryId}`, payload),
  deactivate: (categoryId: number) => api.del(`/categories/${categoryId}`),
}

/* -------------------------------------------------------------------------- */
/* Catalog — options & option values                                           */
/* -------------------------------------------------------------------------- */

export const optionsApi = {
  list: (
    params: { cursor?: string | null; limit?: number } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<OptionOut>>("/options", {
      query: { cursor: params.cursor ?? undefined, limit: params.limit },
      signal,
    }),
  get: (optionId: number, signal?: AbortSignal) =>
    api.get<OptionOut>(`/options/${optionId}`, { signal }),
  create: (payload: OptionCreate) => api.post<OptionOut>("/options", payload),
  update: (optionId: number, payload: OptionUpdate) =>
    api.patch<OptionOut>(`/options/${optionId}`, payload),
}

export const optionValuesApi = {
  list: (
    params: { option_id?: number | null; cursor?: string | null; limit?: number } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<OptionValueOut>>("/option-values", {
      query: {
        option_id: params.option_id ?? undefined,
        cursor: params.cursor ?? undefined,
        limit: params.limit,
      },
      signal,
    }),
  get: (valueId: number, signal?: AbortSignal) =>
    api.get<OptionValueOut>(`/option-values/${valueId}`, { signal }),
  create: (payload: OptionValueCreate) =>
    api.post<OptionValueOut>("/option-values", payload),
  update: (valueId: number, payload: OptionValueUpdate) =>
    api.patch<OptionValueOut>(`/option-values/${valueId}`, payload),
}

/* -------------------------------------------------------------------------- */
/* Catalog — media                                                             */
/* -------------------------------------------------------------------------- */

export const mediaApi = {
  get: (mediaId: number, signal?: AbortSignal) =>
    api.get<MediaOut>(`/media/${mediaId}`, { signal }),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiUpload<MediaOut>("/media/upload", formData)
  },
  attach: (mediaId: number, payload: ProductMediaAttach) =>
    api.post<ProductMediaOut>(`/media/${mediaId}/attach`, payload),
}

/* -------------------------------------------------------------------------- */
/* Products & variants                                                         */
/* -------------------------------------------------------------------------- */

export const productsApi = {
  list: (params: ProductListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<ProductOut>>("/products", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        q: params.q ?? undefined,
        status: params.status ?? undefined,
        brand_id: params.brand_id ?? undefined,
        product_type: params.product_type ?? undefined,
        is_featured: params.is_featured ?? undefined,
        is_best_seller: params.is_best_seller ?? undefined,
        is_on_offer: params.is_on_offer ?? undefined,
      },
      signal,
    }),
  get: (productId: number, signal?: AbortSignal) =>
    api.get<ProductOut>(`/products/${productId}`, { signal }),
  create: (payload: ProductCreate) => api.post<ProductOut>("/products", payload),
  update: (productId: number, payload: ProductUpdate) =>
    api.patch<ProductOut>(`/products/${productId}`, payload),
  setStatus: (productId: number, status: string) =>
    api.patch<ProductOut>(`/products/${productId}/status`, { status }),
  listVariants: (productId: number, signal?: AbortSignal) =>
    api.get<VariantOut[]>(`/products/${productId}/variants`, { signal }),
  /** The product's gallery, primary first, with each file inlined. */
  listMedia: (productId: number, signal?: AbortSignal) =>
    api.get<ProductMediaItemOut[]>(`/products/${productId}/media`, { signal }),
  /** Combinations are explicit; >300 for one product is rejected by the API. */
  generateVariants: (productId: number, payload: GenerateVariantsRequest) =>
    api.post<VariantOut[]>(`/products/${productId}/variants/generate`, payload),
}

export const variantsApi = {
  get: (variantId: number, signal?: AbortSignal) =>
    api.get<VariantOut>(`/variants/${variantId}`, { signal }),
  update: (variantId: number, payload: VariantUpdate) =>
    api.patch<VariantOut>(`/variants/${variantId}`, payload),
  /** Separate endpoint because price edits need variant.price_edit. */
  updatePrice: (variantId: number, payload: VariantPriceUpdate) =>
    api.patch<VariantOut>(`/variants/${variantId}/price`, payload),
  discontinue: (variantId: number) => api.del(`/variants/${variantId}`),
}

/* -------------------------------------------------------------------------- */
/* Inventory — locations                                                       */
/* -------------------------------------------------------------------------- */

export const locationsApi = {
  list: (
    params: {
      cursor?: string | null
      limit?: number
      type?: string | null
      is_active?: boolean | null
    } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<LocationOut>>("/locations", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit ?? 100,
        type: params.type ?? undefined,
        is_active: params.is_active ?? undefined,
      },
      signal,
    }),
  get: (locationId: number, signal?: AbortSignal) =>
    api.get<LocationOut>(`/locations/${locationId}`, { signal }),
  create: (payload: LocationCreate) =>
    api.post<LocationOut>("/locations", payload),
  update: (locationId: number, payload: LocationUpdate) =>
    api.patch<LocationOut>(`/locations/${locationId}`, payload),
  deactivate: (locationId: number) => api.del(`/locations/${locationId}`),
}

/* -------------------------------------------------------------------------- */
/* Inventory — stock, transfers, counts                                        */
/* -------------------------------------------------------------------------- */

export const stockApi = {
  /** Levels across every location for one variant. */
  levels: (variantId: number, signal?: AbortSignal) =>
    api.get<StockLevelOut[]>("/stock", { query: { variant_id: variantId }, signal }),
  /** Always writes a stock_movements ledger row in the same transaction. */
  adjust: (payload: StockAdjustRequest) =>
    api.post<StockMovementOut>("/stock/adjust", payload),
}

export const transfersApi = {
  get: (transferId: number, signal?: AbortSignal) =>
    api.get<TransferOut>(`/transfers/${transferId}`, { signal }),
  create: (payload: TransferCreate) =>
    api.post<TransferOut>("/transfers", payload),
  dispatch: (transferId: number, payload: TransferDispatchRequest) =>
    api.post<TransferOut>(`/transfers/${transferId}/dispatch`, payload),
  receive: (transferId: number, payload: TransferReceiveRequest) =>
    api.post<TransferOut>(`/transfers/${transferId}/receive`, payload),
}

export const countsApi = {
  get: (countId: number, signal?: AbortSignal) =>
    api.get<StockCountOut>(`/counts/${countId}`, { signal }),
  create: (payload: StockCountCreate) =>
    api.post<StockCountOut>("/counts", payload),
  record: (countId: number, payload: StockCountRecordRequest) =>
    api.post<StockCountOut>(`/counts/${countId}/record`, payload),
  apply: (countId: number) => api.post<StockCountOut>(`/counts/${countId}/apply`),
}

/* -------------------------------------------------------------------------- */
/* Purchasing                                                                  */
/* -------------------------------------------------------------------------- */

export const suppliersApi = {
  list: (
    params: { cursor?: string | null; limit?: number; is_active?: boolean | null } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<SupplierOut>>("/suppliers", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        is_active: params.is_active ?? undefined,
      },
      signal,
    }),
  get: (supplierId: number, signal?: AbortSignal) =>
    api.get<SupplierOut>(`/suppliers/${supplierId}`, { signal }),
  create: (payload: SupplierCreate) =>
    api.post<SupplierOut>("/suppliers", payload),
  update: (supplierId: number, payload: SupplierUpdate) =>
    api.patch<SupplierOut>(`/suppliers/${supplierId}`, payload),
  deactivate: (supplierId: number) => api.del(`/suppliers/${supplierId}`),
}

export const purchaseOrdersApi = {
  get: (poId: number, signal?: AbortSignal) =>
    api.get<PurchaseOrderOut>(`/purchase-orders/${poId}`, { signal }),
  create: (payload: PurchaseOrderCreate) =>
    api.post<PurchaseOrderOut>("/purchase-orders", payload),
  approve: (poId: number) =>
    api.post<PurchaseOrderOut>(`/purchase-orders/${poId}/approve`),
  send: (poId: number) =>
    api.post<PurchaseOrderOut>(`/purchase-orders/${poId}/send`),
  cancel: (poId: number) =>
    api.post<PurchaseOrderOut>(`/purchase-orders/${poId}/cancel`),
}

export const goodsReceiptsApi = {
  get: (receiptId: number, signal?: AbortSignal) =>
    api.get<GoodsReceiptOut>(`/goods-receipts/${receiptId}`, { signal }),
  create: (payload: GoodsReceiptCreate) =>
    api.post<GoodsReceiptOut>("/goods-receipts", payload),
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

export const ordersApi = {
  list: (params: OrderListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<OrderOut>>("/orders", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        status: params.status ?? undefined,
        payment_status: params.payment_status ?? undefined,
        fulfilment_status: params.fulfilment_status ?? undefined,
        customer_id: params.customer_id ?? undefined,
      },
      signal,
    }),
  get: (orderId: number, signal?: AbortSignal) =>
    api.get<OrderOut>(`/orders/${orderId}`, { signal }),
  updateStatus: (orderId: number, payload: OrderStatusUpdate) =>
    api.patch<OrderOut>(`/orders/${orderId}/status`, payload),
  addNote: (orderId: number, payload: OrderNoteIn) =>
    api.post<OrderNoteOut>(`/orders/${orderId}/notes`, payload),
  refund: (orderId: number, payload: RefundRequest) =>
    api.post<PaymentRefundOut>(`/orders/${orderId}/refund`, payload),
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                   */
/* -------------------------------------------------------------------------- */

export const customersApi = {
  list: (
    params: { cursor?: string | null; limit?: number; is_active?: boolean | null } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<CustomerOut>>("/customers", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        is_active: params.is_active ?? undefined,
      },
      signal,
    }),
  get: (customerId: number, signal?: AbortSignal) =>
    api.get<CustomerOut>(`/customers/${customerId}`, { signal }),
  update: (customerId: number, payload: CustomerUpdate) =>
    api.patch<CustomerOut>(`/customers/${customerId}`, payload),
  listAddresses: (customerId: number, signal?: AbortSignal) =>
    api.get<CustomerAddressOut[]>(`/customers/${customerId}/addresses`, { signal }),
  createAddress: (customerId: number, payload: CustomerAddressCreate) =>
    api.post<CustomerAddressOut>(`/customers/${customerId}/addresses`, payload),
  updateAddress: (addressId: number, payload: CustomerAddressUpdate) =>
    api.patch<CustomerAddressOut>(`/customers/addresses/${addressId}`, payload),
}

/* -------------------------------------------------------------------------- */
/* System — settings & audit                                                   */
/* -------------------------------------------------------------------------- */

export const settingsApi = {
  list: (group?: string | null, signal?: AbortSignal) =>
    api.get<SettingOut[]>("/settings", {
      query: { group: group ?? undefined },
      signal,
    }),
  get: (key: string, signal?: AbortSignal) =>
    api.get<SettingOut>(`/settings/${encodeURIComponent(key)}`, { signal }),
  update: (key: string, payload: SettingUpdate) =>
    api.patch<SettingOut>(`/settings/${encodeURIComponent(key)}`, payload),
}

export const auditApi = {
  list: (params: AuditListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<AuditLogOut>>("/audit", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        entity_type: params.entity_type ?? undefined,
        actor_user_id: params.actor_user_id ?? undefined,
        action: params.action ?? undefined,
        date_from: params.date_from ?? undefined,
        date_to: params.date_to ?? undefined,
      },
      signal,
    }),
}

/* -------------------------------------------------------------------------- */
/* CMS — banners                                                               */
/* -------------------------------------------------------------------------- */

export const bannersApi = {
  list: (
    params: {
      cursor?: string | null
      limit?: number
      placement?: string | null
      is_active?: boolean | null
    } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<BannerOut>>("/banners", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        placement: params.placement ?? undefined,
        is_active: params.is_active ?? undefined,
      },
      signal,
    }),
  get: (bannerId: number, signal?: AbortSignal) =>
    api.get<BannerOut>(`/banners/${bannerId}`, { signal }),
  create: (payload: BannerCreate) => api.post<BannerOut>("/banners", payload),
  update: (bannerId: number, payload: BannerUpdate) =>
    api.patch<BannerOut>(`/banners/${bannerId}`, payload),
  deactivate: (bannerId: number) => api.del(`/banners/${bannerId}`),
}

/* -------------------------------------------------------------------------- */
/* CMS — menus                                                                 */
/* -------------------------------------------------------------------------- */

export const menusApi = {
  list: (
    params: { cursor?: string | null; limit?: number } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<MenuOut>>("/menus", {
      query: { cursor: params.cursor ?? undefined, limit: params.limit },
      signal,
    }),
  get: (menuId: number, signal?: AbortSignal) =>
    api.get<MenuOut>(`/menus/${menuId}`, { signal }),
  create: (payload: MenuCreate) => api.post<MenuOut>("/menus", payload),
  update: (menuId: number, payload: MenuUpdate) =>
    api.patch<MenuOut>(`/menus/${menuId}`, payload),
  deactivate: (menuId: number) => api.del(`/menus/${menuId}`),
  createItem: (menuId: number, payload: MenuItemCreate) =>
    api.post<MenuItemOut>(`/menus/${menuId}/items`, payload),
  updateItem: (itemId: number, payload: MenuItemUpdate) =>
    api.patch<MenuItemOut>(`/menus/items/${itemId}`, payload),
  deactivateItem: (itemId: number) => api.del(`/menus/items/${itemId}`),
}

/* -------------------------------------------------------------------------- */
/* CMS — pages                                                                 */
/* -------------------------------------------------------------------------- */

export const pagesApi = {
  list: (
    params: { cursor?: string | null; limit?: number; status?: string | null } = {},
    signal?: AbortSignal
  ) =>
    api.get<CursorPage<PageOut>>("/pages", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        status: params.status ?? undefined,
      },
      signal,
    }),
  get: (pageId: number, signal?: AbortSignal) =>
    api.get<PageOut>(`/pages/${pageId}`, { signal }),
  create: (payload: PageCreate) => api.post<PageOut>("/pages", payload),
  update: (pageId: number, payload: PageUpdate) =>
    api.patch<PageOut>(`/pages/${pageId}`, payload),
  unpublish: (pageId: number) => api.del(`/pages/${pageId}`),
}
