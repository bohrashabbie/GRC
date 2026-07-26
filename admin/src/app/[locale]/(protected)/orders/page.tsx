"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useLocale, useTranslations } from "next-intl"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { useCursorList } from "@/hooks/use-cursor-list"
import { useQueryParam } from "@/hooks/use-query-param"
import { ordersApi } from "@/lib/api/endpoints"
import { formatMoney } from "@/lib/format"
import {
  FULFILMENT_STATUS_VALUES,
  ORDER_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  humanizeStatus,
} from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { useRouter } from "@/i18n/navigation"
import type { OrderOut } from "@/lib/api/types"

const ANY = "__any__"

export default function OrdersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.orderView}>
      <OrdersContent />
    </RequireRoutePermission>
  )
}

function OrdersContent() {
  const t = useTranslations("orders")
  const c = useTranslations("common")
  const locale = useLocale()
  const format = useFormatter()
  const router = useRouter()

  const [statusParam, setStatusParam] = useQueryParam("status")
  const [paymentParam, setPaymentParam] = useQueryParam("payment")
  const [fulfilmentParam, setFulfilmentParam] = useQueryParam("fulfilment")

  const status = statusParam ?? null
  const paymentStatus = paymentParam ?? null
  const fulfilmentStatus = fulfilmentParam ?? null

  const list = useCursorList<OrderOut>({
    queryKey: queryKeys.orders.list({
      status,
      payment_status: paymentStatus,
      fulfilment_status: fulfilmentStatus,
    }),
    fetchPage: (cursor, signal) =>
      ordersApi.list(
        {
          cursor,
          limit: 20,
          status,
          payment_status: paymentStatus,
          fulfilment_status: fulfilmentStatus,
        },
        signal
      ),
  })

  const columns: ColumnDef<OrderOut, unknown>[] = [
    {
      accessorKey: "order_number",
      header: t("columns.orderNumber"),
      cell: ({ row }) => (
        <code className="text-xs font-medium text-foreground">
          {row.original.order_number}
        </code>
      ),
    },
    {
      id: "customer",
      header: t("columns.customer"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.email ?? row.original.phone_e164 ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("columns.status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "payment_status",
      header: t("columns.payment"),
      cell: ({ row }) => <StatusBadge status={row.original.payment_status} />,
    },
    {
      accessorKey: "fulfilment_status",
      header: t("columns.fulfilment"),
      cell: ({ row }) => <StatusBadge status={row.original.fulfilment_status} />,
    },
    {
      id: "total",
      header: t("columns.total"),
      cell: ({ row }) => (
        <span className="font-medium">
          {formatMoney(row.original.grand_total, locale, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "placed_at",
      header: t("columns.placedAt"),
      cell: ({ row }) =>
        format.dateTime(new Date(row.original.placed_at), "short"),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status ?? ANY}
          onValueChange={(next) =>
            setStatusParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            {ORDER_STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {humanizeStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentStatus ?? ANY}
          onValueChange={(next) =>
            setPaymentParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filters.paymentStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            {PAYMENT_STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {humanizeStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={fulfilmentStatus ?? ANY}
          onValueChange={(next) =>
            setFulfilmentParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filters.fulfilmentStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            {FULFILMENT_STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {humanizeStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(order) => router.push(`/orders/${order.id}`)}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />
    </div>
  )
}
