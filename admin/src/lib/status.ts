/**
 * Mirrors of the backend's status vocabularies. The transition tables are
 * copied from Api/app/services/order_service.py so the UI only ever offers a
 * move the API will accept — the API still validates, this just avoids
 * showing buttons that are guaranteed to 422.
 *
 * If the backend's tables change, these must change with them.
 */

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info"

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

export const PAYMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  unpaid: ["authorised", "paid", "failed"],
  authorised: ["paid", "failed"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  failed: ["unpaid"],
}

export const FULFILMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  unfulfilled: ["partially_fulfilled", "fulfilled"],
  partially_fulfilled: ["fulfilled"],
  fulfilled: ["returned"],
  returned: [],
}

export const ORDER_STATUS_VALUES = Object.keys(ORDER_STATUS_TRANSITIONS)
export const PAYMENT_STATUS_VALUES = Object.keys(PAYMENT_STATUS_TRANSITIONS)
export const FULFILMENT_STATUS_VALUES = Object.keys(FULFILMENT_STATUS_TRANSITIONS)

export function nextOrderStatuses(
  field: "status" | "payment_status" | "fulfilment_status",
  current: string
): string[] {
  const table =
    field === "status"
      ? ORDER_STATUS_TRANSITIONS
      : field === "payment_status"
        ? PAYMENT_STATUS_TRANSITIONS
        : FULFILMENT_STATUS_TRANSITIONS
  return table[current] ?? []
}

/* -------------------------------------------------------------------------- */
/* Other status vocabularies                                                   */
/* -------------------------------------------------------------------------- */

export const PRODUCT_STATUS_VALUES = ["draft", "active", "archived"] as const
export const PRODUCT_TYPE_VALUES = [
  "thobe",
  "shemagh",
  "innerwear",
  "accessory",
] as const
export const LOCATION_TYPE_VALUES = ["warehouse", "store"] as const
export const OPTION_INPUT_TYPES = ["dropdown", "swatch", "button"] as const
export const CATEGORY_DIMENSIONS = ["category", "collection", "occasion"] as const

/* -------------------------------------------------------------------------- */
/* Badge tones                                                                 */
/* -------------------------------------------------------------------------- */

const TONE_BY_STATUS: Record<string, BadgeTone> = {
  // orders
  pending: "warning",
  confirmed: "info",
  processing: "info",
  completed: "success",
  cancelled: "danger",
  // payments
  unpaid: "warning",
  authorised: "info",
  paid: "success",
  partially_refunded: "warning",
  refunded: "danger",
  failed: "danger",
  captured: "success",
  initiated: "neutral",
  // fulfilment
  unfulfilled: "warning",
  partially_fulfilled: "info",
  fulfilled: "success",
  returned: "danger",
  // products
  draft: "neutral",
  active: "success",
  archived: "neutral",
  // transfers / POs / counts
  open: "info",
  in_transit: "info",
  dispatched: "info",
  received: "success",
  approved: "success",
  sent: "info",
  applied: "success",
  counting: "warning",
  closed: "neutral",
}

export function statusTone(status: string): BadgeTone {
  return TONE_BY_STATUS[status] ?? "neutral"
}

/** Turns a snake_case API value into readable text for locales without an
 * explicit translation (statuses are open-ended server-side). */
export function humanizeStatus(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}
