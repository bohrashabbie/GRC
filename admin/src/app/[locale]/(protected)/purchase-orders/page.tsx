"use client"

import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { PoCreateDialog } from "@/components/purchase-orders/po-create-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { useQueryParam } from "@/hooks/use-query-param"
import { purchaseOrdersApi, suppliersApi } from "@/lib/api/endpoints"
import { formatMoney } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { PO_STATUS_VALUES, humanizeStatus } from "@/lib/status"
import { useRouter } from "@/i18n/navigation"
import type { PurchaseOrderOut } from "@/lib/api/types"

const ANY = "__any__"

export default function PurchaseOrdersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.inventoryView}>
      <PurchaseOrdersContent />
    </RequireRoutePermission>
  )
}

function PurchaseOrdersContent() {
  const t = useTranslations("purchaseOrders")
  const c = useTranslations("common")
  const locale = useLocale()
  const format = useFormatter()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  const [supplierParam, setSupplierParam] = useQueryParam("supplier")
  const [statusParam, setStatusParam] = useQueryParam("status")
  const [searchParam, setSearchParam] = useQueryParam("q")
  const supplierId = supplierParam ? Number(supplierParam) : null
  const status = statusParam ?? null
  const search = searchParam ?? null

  // Suppliers drive the "whose orders am I looking at" filter, which is the
  // question the old lookup-by-id box could not answer at all.
  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers.list({ is_active: true }),
    queryFn: ({ signal }) => suppliersApi.list({ limit: 100, is_active: true }, signal),
  })
  const suppliers = suppliersQuery.data?.items ?? []

  const list = useCursorList<PurchaseOrderOut>({
    queryKey: queryKeys.purchaseOrders.list({
      supplier_id: supplierId,
      status,
      q: search,
    }),
    fetchPage: (cursor, signal) =>
      purchaseOrdersApi.list(
        { cursor, limit: 20, supplier_id: supplierId, status, q: search },
        signal
      ),
  })

  const columns: ColumnDef<PurchaseOrderOut, unknown>[] = [
    {
      accessorKey: "po_number",
      header: t("columns.number"),
      cell: ({ row }) => (
        <span dir="ltr" className="font-medium text-foreground">
          {row.original.po_number}
        </span>
      ),
    },
    {
      id: "supplier",
      header: t("columns.supplier"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.supplier_name ?? `#${row.original.supplier_id}`}
        </span>
      ),
    },
    {
      id: "destination",
      header: t("columns.destination"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.destination_name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: c("status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "received",
      header: t("columns.received"),
      // A PO that has been received against reads differently from one still
      // outstanding, which is the whole point of a purchasing list.
      cell: ({ row }) =>
        row.original.received_line_count > 0 ? (
          <Badge variant="secondary">
            {t("receiptCount", { count: row.original.received_line_count })}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "expected",
      header: t("columns.expected"),
      cell: ({ row }) =>
        row.original.expected_at
          ? format.dateTime(new Date(row.original.expected_at), "short")
          : "—",
    },
    {
      id: "total",
      header: t("columns.total"),
      cell: ({ row }) => formatMoney(row.original.total, locale),
    },
    {
      accessorKey: "created_at",
      header: t("columns.created"),
      cell: ({ row }) =>
        format.dateTime(new Date(row.original.created_at), "short"),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.purchaseOrderManage}>
            <Button onClick={() => setCreateOpen(true)}>{t("newPo")}</Button>
          </RequirePermission>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search ?? ""}
          onChange={(event) => setSearchParam(event.target.value || null)}
          placeholder={t("searchPlaceholder")}
          className="w-56"
        />
        <Select
          value={supplierId === null ? ANY : String(supplierId)}
          onValueChange={(next) =>
            setSupplierParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t("columns.supplier")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={String(supplier.id)}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status ?? ANY}
          onValueChange={(next) =>
            setStatusParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={c("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            {PO_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {humanizeStatus(value)}
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
        onRowClick={(po) => router.push(`/purchase-orders/${po.id}`)}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />

      {createOpen && (
        <PoCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(id) => router.push(`/purchase-orders/${id}`)}
        />
      )}
    </div>
  )
}
