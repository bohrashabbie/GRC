"use client"

import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { LowStockList } from "@/components/dashboard/low-stock-list"
import { OrdersTimeseriesChart } from "@/components/dashboard/orders-timeseries-chart"
import { StatTile } from "@/components/dashboard/stat-tile"
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart"
import { TopProductsList } from "@/components/dashboard/top-products-list"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ListErrorState } from "@/components/states/list-states"
import { PageHeader } from "@/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { NAV_SECTIONS } from "@/config/nav"
import { useQueryParam } from "@/hooks/use-query-param"
import { Link } from "@/i18n/navigation"
import { analyticsApi } from "@/lib/api/endpoints"
import { formatMoney } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { useAuth } from "@/providers/auth-provider"
import type { AnalyticsRange } from "@/lib/api/types"

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d"]

export default function DashboardPage() {
  const t = useTranslations("nav")
  const auth = useTranslations("auth")
  const { user, permissions } = useAuth()

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.href !== "/dashboard" &&
        (!item.permission || permissions.has(item.permission))
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: t("dashboard") }]} />
      <PageHeader
        title={t("dashboard")}
        description={
          user ? `${auth("signedInAs")} ${user.full_name} (${user.email})` : undefined
        }
      />

      {permissions.has(PERMISSIONS.analyticsView) && <AnalyticsSection />}

      {sections.map((section) => (
        <div key={section.labelKey} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t(section.labelKey)}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate">
                          {t(item.labelKey)}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {item.permission ?? "—"}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalyticsSection() {
  const t = useTranslations("dashboard")
  const locale = useLocale()
  const [range, setRange] = useQueryParamRange()

  const summaryQuery = useQuery({
    queryKey: queryKeys.analytics.summary(range),
    queryFn: ({ signal }) => analyticsApi.summary(range, signal),
  })
  const timeseriesQuery = useQuery({
    queryKey: queryKeys.analytics.timeseries(range),
    queryFn: ({ signal }) => analyticsApi.ordersTimeseries(range, signal),
  })
  const statusQuery = useQuery({
    queryKey: queryKeys.analytics.byStatus(range),
    queryFn: ({ signal }) => analyticsApi.ordersByStatus(range, signal),
  })
  const topProductsQuery = useQuery({
    queryKey: queryKeys.analytics.topProducts(range, 5),
    queryFn: ({ signal }) => analyticsApi.topProducts(range, 5, signal),
  })
  const lowStockQuery = useQuery({
    queryKey: queryKeys.analytics.lowStock(10),
    queryFn: ({ signal }) => analyticsApi.lowStock(10, signal),
  })

  const summary = summaryQuery.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("title")}
        </h2>
        <Select value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`ranges.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summaryQuery.isError ? (
        <ListErrorState error={summaryQuery.error} onRetry={() => summaryQuery.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryQuery.isLoading || !summary ? (
            <>
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </>
          ) : (
            <>
              <StatTile
                label={t("kpi.revenue")}
                value={formatMoney(summary.revenue.value, locale)}
                changePct={summary.revenue.change_pct}
              />
              <StatTile
                label={t("kpi.orders")}
                value={summary.orders.value}
                changePct={summary.orders.change_pct}
              />
              <StatTile
                label={t("kpi.avgOrderValue")}
                value={formatMoney(summary.avg_order_value.value, locale)}
                changePct={summary.avg_order_value.change_pct}
              />
              <StatTile
                label={t("kpi.activeCustomers")}
                value={summary.active_customers.value}
                changePct={summary.active_customers.change_pct}
              />
            </>
          )}
        </div>
      )}

      {timeseriesQuery.isError ? (
        <ListErrorState
          error={timeseriesQuery.error}
          onRetry={() => timeseriesQuery.refetch()}
        />
      ) : timeseriesQuery.isLoading || !timeseriesQuery.data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : (
        <OrdersTimeseriesChart points={timeseriesQuery.data.points} locale={locale} />
      )}

      {statusQuery.isError ? (
        <ListErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} />
      ) : statusQuery.isLoading || !statusQuery.data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <StatusBreakdownChart
          byStatus={statusQuery.data.by_status}
          byPaymentStatus={statusQuery.data.by_payment_status}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {topProductsQuery.isError ? (
          <ListErrorState
            error={topProductsQuery.error}
            onRetry={() => topProductsQuery.refetch()}
          />
        ) : topProductsQuery.isLoading || !topProductsQuery.data ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <TopProductsList products={topProductsQuery.data} locale={locale} />
        )}

        {lowStockQuery.isError ? (
          <ListErrorState
            error={lowStockQuery.error}
            onRetry={() => lowStockQuery.refetch()}
          />
        ) : lowStockQuery.isLoading || !lowStockQuery.data ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <LowStockList items={lowStockQuery.data} />
        )}
      </div>
    </div>
  )
}

/** Keeps the selected range in the URL like every other list filter, defaulting
 * to 30d rather than requiring the param to be present. */
function useQueryParamRange(): [AnalyticsRange, (next: AnalyticsRange) => void] {
  const [raw, setRaw] = useQueryParam("range")
  const value: AnalyticsRange = RANGES.includes(raw as AnalyticsRange)
    ? (raw as AnalyticsRange)
    : "30d"
  return [value, (next) => setRaw(next)]
}
