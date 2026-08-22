"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useLocale, useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, MessageCircle } from "lucide-react"
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
import { StatusFilter, useStatusFilter } from "@/components/status-filter"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { useCursorList } from "@/hooks/use-cursor-list"
import { customersApi } from "@/lib/api/endpoints"
import { customerName } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { useQueryParam } from "@/hooks/use-query-param"
import { formatMoney } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import { useRouter } from "@/i18n/navigation"
import type { CustomerOut, CustomerSegment } from "@/lib/api/types"

export default function CustomersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.customerView}>
      <CustomersContent />
    </RequireRoutePermission>
  )
}

const ANY = "__any__"
const SEGMENTS: CustomerSegment[] = ["purchased", "registered", "pending", "marketing"]

/** WhatsApp and email links for one customer, or a dash when we hold neither. */
function ReachOutActions({
  customer,
  whatsappLabel,
  emailLabel,
}: {
  customer: CustomerOut
  whatsappLabel: string
  emailLabel: string
}) {
  const digits = (customer.phone_e164 ?? "").replace(/[^\d]/g, "")
  if (!digits && !customer.email) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="flex items-center gap-1.5">
      {digits && (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={whatsappLabel}
          title={whatsappLabel}
          onClick={(event) => {
            event.stopPropagation()
            window.open(`https://wa.me/${digits}`, "_blank", "noopener")
          }}
        >
          <MessageCircle />
        </Button>
      )}
      {customer.email && (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={emailLabel}
          title={emailLabel}
          onClick={(event) => {
            event.stopPropagation()
            window.location.href = `mailto:${customer.email}`
          }}
        >
          <Mail />
        </Button>
      )}
    </div>
  )
}

function CustomersContent() {
  const t = useTranslations("customers")
  const c = useTranslations("common")
  const format = useFormatter()
  const locale = useLocale()
  const router = useRouter()

  const { status, setStatus, isActive } = useStatusFilter()
  const [segmentParam, setSegmentParam] = useQueryParam("segment")
  const [searchParam, setSearchParam] = useQueryParam("q")
  const segment = (segmentParam as CustomerSegment | null) ?? null
  const search = searchParam ?? null

  const list = useCursorList<CustomerOut>({
    queryKey: queryKeys.customers.list({
      is_active: isActive,
      segment,
      q: search,
    }),
    fetchPage: (cursor, signal) =>
      customersApi.list(
        { cursor, limit: 20, is_active: isActive, segment, q: search },
        signal
      ),
  })

  const columns: ColumnDef<CustomerOut, unknown>[] = [
    {
      id: "name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {customerName(row.original, t("anonymous"))}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: t("columns.email"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
      ),
    },
    {
      accessorKey: "phone_e164",
      header: t("columns.phone"),
      cell: ({ row }) => row.original.phone_e164 ?? "—",
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.is_active ? "active" : "archived"}
          label={row.original.is_active ? c("active") : c("inactive")}
        />
      ),
    },
    {
      id: "orders",
      header: t("columns.orders"),
      cell: ({ row }) => {
        const { order_count, pending_order_count } = row.original
        if (order_count === 0) {
          return <Badge variant="outline">{t("segments.registered")}</Badge>
        }
        return (
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{order_count}</span>
            {pending_order_count > 0 && (
              <Badge variant="secondary" className="whitespace-nowrap">
                {t("openOrders", { count: pending_order_count })}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: "spent",
      header: t("columns.spent"),
      cell: ({ row }) => formatMoney(row.original.total_spent, locale),
    },
    {
      accessorKey: "created_at",
      header: t("columns.created"),
      cell: ({ row }) =>
        format.dateTime(new Date(row.original.created_at), "short"),
    },
    {
      id: "actions",
      header: c("actions"),
      // Opens WhatsApp or the mail client with this customer in it. Sending
      // happens from the staff member's own phone or mailbox: no message
      // leaves this admin, so there is nothing to queue, throttle or log.
      cell: ({ row }) => (
        <ReachOutActions customer={row.original} whatsappLabel={t("whatsapp")} emailLabel={t("email")} />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search ?? ""}
          onChange={(event) => setSearchParam(event.target.value || null)}
          placeholder={t("searchPlaceholder")}
          className="w-64"
        />
        <Select
          value={segment ?? ANY}
          onValueChange={(next) =>
            setSegmentParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t("columns.orders")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            {SEGMENTS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`segments.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StatusFilter value={status} onChange={setStatus} />
      </div>

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />
    </div>
  )
}
