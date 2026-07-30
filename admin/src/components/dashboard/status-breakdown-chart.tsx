"use client"

import { useTranslations } from "next-intl"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { humanizeStatus, statusTone } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { StatusCount } from "@/lib/api/types"

const TONE_BAR_CLASS: Record<string, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-destructive",
  info: "bg-status-info",
}

/**
 * Order/payment status is a state, not a free identity — so each bar takes
 * its status tone (the same one StatusBadge uses everywhere else) rather than
 * a categorical palette slot. That also sidesteps the categorical palette's
 * 5-slot ceiling: payment_status alone has 6 possible values.
 */
function StatusBarList({ rows }: { rows: StatusCount[] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const pct = total > 0 ? (row.count / total) * 100 : 0
        const tone = statusTone(row.status)
        return (
          <div key={row.status} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {humanizeStatus(row.status)}
              </span>
              <span className="tabular-nums text-muted-foreground">{row.count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", TONE_BAR_CLASS[tone])}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function StatusBreakdownChart({
  byStatus,
  byPaymentStatus,
}: {
  byStatus: StatusCount[]
  byPaymentStatus: StatusCount[]
}) {
  const t = useTranslations("dashboard")

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t("charts.statusBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byStatus.length > 0 ? (
            <StatusBarList rows={byStatus} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t("charts.paymentBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byPaymentStatus.length > 0 ? (
            <StatusBarList rows={byPaymentStatus} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
