import { Badge } from "@/components/ui/badge"
import type { StockState } from "@/lib/api/types"

/**
 * The stock badge, shared by the product list and the variants tab so both
 * screens agree on what "low" looks like.
 *
 * Zero and low are deliberately different weights: a muted badge is a nudge to
 * reorder, a destructive one means the storefront is already refusing the sale.
 * Nothing is shown for healthy stock — a badge on every row would say nothing.
 */
export function stockStateOf(
  quantity: number,
  threshold: number | null,
  tracked: boolean
): StockState | "untracked" {
  if (!tracked) return "untracked"
  if (quantity <= 0) return "out_of_stock"
  if (threshold !== null && quantity <= threshold) return "low_stock"
  return "in_stock"
}

export function StockBadge({
  quantity,
  threshold,
  tracked,
  outOfStockLabel,
  lowStockLabel,
  untrackedLabel,
}: {
  quantity: number
  threshold: number | null
  tracked: boolean
  outOfStockLabel: string
  lowStockLabel: string
  untrackedLabel: string
}) {
  const state = stockStateOf(quantity, threshold, tracked)

  if (state === "untracked") {
    return (
      <Badge variant="outline" className="whitespace-nowrap">
        {untrackedLabel}
      </Badge>
    )
  }
  if (state === "out_of_stock") {
    return (
      <Badge variant="destructive" className="whitespace-nowrap">
        {outOfStockLabel}
      </Badge>
    )
  }
  if (state === "low_stock") {
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        {lowStockLabel}
      </Badge>
    )
  }
  return null
}
