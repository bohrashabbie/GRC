"use client"

import { useQuery } from "@tanstack/react-query"
import { useFormatter, useLocale, useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { useQueryParam } from "@/hooks/use-query-param"
import { analyticsApi } from "@/lib/api/endpoints"
import { formatMoney } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { humanizeStatus } from "@/lib/status"
import type { AnalyticsRange } from "@/lib/api/types"

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "365d"]

export default function ReportsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.analyticsView}>
      <ReportsContent />
    </RequireRoutePermission>
  )
}

function ReportsContent() {
  const t = useTranslations("reports")
  const c = useTranslations("common")
  const locale = useLocale()
  const format = useFormatter()

  const [rangeParam, setRangeParam] = useQueryParam("range")
  const range = (RANGES.includes(rangeParam as AnalyticsRange)
    ? rangeParam
    : "30d") as AnalyticsRange

  // Every figure on this page comes from the orders table through the
  // analytics endpoints — nothing here is fixed or seeded, so the report is
  // whatever the shop actually did in the window chosen.
  const summaryQuery = useQuery({
    queryKey: queryKeys.analytics.summary(range),
    queryFn: ({ signal }) => analyticsApi.summary(range, signal),
  })
  const seriesQuery = useQuery({
    queryKey: queryKeys.analytics.timeseries(range),
    queryFn: ({ signal }) => analyticsApi.ordersTimeseries(range, signal),
  })
  const statusQuery = useQuery({
    queryKey: queryKeys.analytics.byStatus(range),
    queryFn: ({ signal }) => analyticsApi.ordersByStatus(range, signal),
  })

  const points = seriesQuery.data?.points ?? []
  // Days with no orders are dropped: a report is easier to read as the days
  // that happened than as a run of zeroes.
  const rows = points.filter((point) => point.orders_count > 0)
  const totalOrders = rows.reduce((sum, point) => sum + point.orders_count, 0)
  const totalRevenue = rows.reduce(
    (sum, point) => sum + Number(point.revenue),
    0
  )
  const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const isLoading =
    summaryQuery.isLoading || seriesQuery.isLoading || statusQuery.isLoading
  const error = summaryQuery.error ?? seriesQuery.error ?? statusQuery.error

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Select
            value={range}
            onValueChange={(next) => setRangeParam(next === "30d" ? null : next)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`ranges.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading && <ListLoadingSkeleton rows={5} />}
      {error && (
        <ListErrorState
          error={error}
          onRetry={() => {
            summaryQuery.refetch()
            seriesQuery.refetch()
            statusQuery.refetch()
          }}
        />
      )}

      {!isLoading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <TotalCard
              label={t("totals.orders")}
              value={String(totalOrders)}
            />
            <TotalCard
              label={t("totals.revenue")}
              value={formatMoney(totalRevenue.toFixed(3), locale)}
            />
            <TotalCard
              label={t("totals.average")}
              value={formatMoney(averageOrder.toFixed(3), locale)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("byStatusTitle")}</CardTitle>
              <CardDescription>{t("byStatusHint")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(statusQuery.data?.by_status ?? []).length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  {t("empty")}
                </span>
              ) : (
                (statusQuery.data?.by_status ?? []).map((entry) => (
                  <Badge key={entry.status} variant="outline">
                    {humanizeStatus(entry.status)} · {entry.count}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("byDayTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <ListEmptyState description={t("empty")} />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("columns.day")}</TableHead>
                        <TableHead>{t("columns.orders")}</TableHead>
                        <TableHead>{t("columns.revenue")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((point) => (
                        <TableRow key={point.date} className="even:bg-muted/30">
                          <TableCell>
                            {format.dateTime(new Date(point.date), "short")}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {point.orders_count}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatMoney(point.revenue, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-medium">
                          {c("total")}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          {totalOrders}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          {formatMoney(totalRevenue.toFixed(3), locale)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
