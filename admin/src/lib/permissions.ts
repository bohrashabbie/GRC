/**
 * Mirror of Api/app/permissions.py. Nav and UI gating reference these constants
 * so a typo becomes a TypeScript error instead of a silently hidden button.
 *
 * This list is cosmetic only — the backend's require() dependency is the actual
 * security boundary. Hiding a button here prevents confusion, not access.
 */
export const PERMISSIONS = {
  // system
  userView: "user.view",
  userCreate: "user.create",
  userUpdate: "user.update",
  userAssignRole: "user.assign_role",
  roleView: "role.view",
  roleManagePermissions: "role.manage_permissions",
  auditView: "audit.view",
  settingsView: "settings.view",
  settingsUpdate: "settings.update",

  // catalog
  catalogView: "catalog.view",
  catalogManage: "catalog.manage",
  productPublish: "product.publish",
  mediaUpload: "media.upload",
  variantPriceEdit: "variant.price_edit",

  // inventory
  inventoryView: "inventory.view",
  stockAdjust: "stock.adjust",
  locationManage: "location.manage",
  supplierManage: "supplier.manage",
  purchaseOrderManage: "purchase_order.manage",
  goodsReceiptCreate: "goods_receipt.create",

  // orders
  orderView: "order.view",
  orderUpdateStatus: "order.update_status",
  orderNote: "order.note",
  orderRefund: "order.refund",
  shipmentManage: "shipment.manage",
  returnManage: "return.manage",

  // customers
  customerView: "customer.view",
  customerUpdate: "customer.update",

  // marketing / finance
  marketingView: "marketing.view",
  cmsView: "cms.view",
  cmsBannerManage: "cms.banner.manage",
  cmsMenuManage: "cms.menu.manage",
  cmsPageManage: "cms.page.manage",
  cmsPagePublish: "cms.page.publish",
  financeView: "finance.view",
  analyticsView: "analytics.view",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** Display order for the permission matrix; matches the backend's groups. */
export const PERMISSION_GROUP_ORDER = [
  "system",
  "catalog",
  "inventory",
  "orders",
  "customers",
  "marketing",
  "finance",
  "analytics",
] as const

export function sortPermissionGroups(groups: string[]): string[] {
  const order = PERMISSION_GROUP_ORDER as readonly string[]
  return [...groups].sort((a, b) => {
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    // Unknown groups (added backend-side later) sort last, alphabetically.
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
