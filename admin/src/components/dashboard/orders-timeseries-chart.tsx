"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useTranslations } from "next-intl"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/format"
import type { TimeseriesPoint } from "@/lib/api/types"

function shortDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso))
}

function compactNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    notation: "compact",
  }).format(value)
}

/** Shared tooltip for both panels below — a single value per point, so no
 * legend is needed (the card title already names the series). */
function PointTooltip({
  active,
  payload,
  label,
  locale,
  formatValue,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  locale: string
  formatValue: (value: number) => string
}) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">
        {shortDate(label, locale)}
      </p>
      <p className="text-muted-foreground">{formatValue(payload[0]!.value)}</p>
    </div>
  )
}

/**
 * Two single-series panels (revenue, orders) rather than one dual-axis chart:
 * the two measures live on incompatible scales (money vs. a small integer
 * count), and a dual-axis line chart makes their trends visually comparable
 * when they aren't actually related — see the dataviz "one axis" rule.
 */
export function OrdersTimeseriesChart({
  points,
  locale,
}: {
  points: TimeseriesPoint[]
  locale: string
}) {
  const t = useTranslations("dashboard")

  const revenueData = points.map((p) => ({ date: p.date, value: Number(p.revenue) }))
  const ordersData = points.map((p) => ({ date: p.date, value: p.orders_count }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t("charts.revenueOverTime")}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-56 pt-0 ps-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => shortDate(d, locale)}
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) => compactNumber(v, locale)}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                content={
                  <PointTooltip
                    locale={locale}
                    formatValue={(v) => formatMoney(String(v), locale)}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t("charts.ordersOverTime")}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-56 pt-0 ps-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ordersData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => shortDate(d, locale)}
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                content={<PointTooltip locale={locale} formatValue={(v) => String(v)} />}
              />
              <Bar dataKey="value" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
