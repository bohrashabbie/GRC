import { TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** One KPI tile: a label, the current value, and — when a previous period
 * exists to compare against — a delta badge. changePct is null rather than 0
 * when there's nothing to compare to yet (empty previous period), so an
 * absent trend never renders as a false "0% change". */
export function StatTile({
  label,
  value,
  changePct,
}: {
  label: string
  value: string
  changePct: number | null
}) {
  const isUp = changePct !== null && changePct > 0
  const isDown = changePct !== null && changePct < 0

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </span>
          {changePct !== null && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-medium tabular-nums",
                isUp && "text-delta-up",
                isDown && "text-delta-down",
                !isUp && !isDown && "text-muted-foreground"
              )}
            >
              {isUp && <TrendingUp className="size-3.5" aria-hidden />}
              {isDown && <TrendingDown className="size-3.5" aria-hidden />}
              {Math.abs(changePct).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
