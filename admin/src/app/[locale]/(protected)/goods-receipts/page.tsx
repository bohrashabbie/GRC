"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { useCursorList } from "@/hooks/use-cursor-list"
import { goodsReceiptsApi } from "@/lib/api/endpoints"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { useRouter } from "@/i18n/navigation"
import type { GoodsReceiptOut } from "@/lib/api/types"

export default function GoodsReceiptsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.inventoryView}>
      <GoodsReceiptsContent />
    </RequireRoutePermission>
  )
}

function GoodsReceiptsContent() {
  const t = useTranslations("goodsReceipts")
  const format = useFormatter()
  const router = useRouter()

  const list = useCursorList<GoodsReceiptOut>({
    queryKey: queryKeys.goodsReceipts.list({}),
    fetchPage: (cursor, signal) =>
      goodsReceiptsApi.list({ cursor, limit: 20 }, signal),
  })

  const columns: ColumnDef<GoodsReceiptOut, unknown>[] = [
    {
      accessorKey: "receipt_number",
      header: t("columns.number"),
      cell: ({ row }) => (
        <span dir="ltr" className="font-medium text-foreground">
          {row.original.receipt_number}
        </span>
      ),
    },
    {
      id: "po",
      header: t("columns.purchaseOrder"),
      // A receipt with no PO is stock that arrived without one being raised —
      // legitimate, and worth showing as such rather than as a blank.
      cell: ({ row }) =>
        row.original.po_number ? (
          <span dir="ltr">{row.original.po_number}</span>
        ) : (
          <Badge variant="outline">{t("noPurchaseOrder")}</Badge>
        ),
    },
    {
      id: "supplier",
      header: t("columns.supplier"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.supplier_name ?? "—"}
        </span>
      ),
    },
    {
      id: "location",
      header: t("columns.location"),
      cell: ({ row }) => row.original.location_name ?? "—",
    },
    {
      id: "lines",
      header: t("columns.lines"),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.items.length}</span>
      ),
    },
    {
      accessorKey: "received_at",
      header: t("columns.received"),
      cell: ({ row }) =>
        format.dateTime(new Date(row.original.received_at), "short"),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(receipt) =>
          receipt.purchase_order_id
            ? router.push(`/purchase-orders/${receipt.purchase_order_id}`)
            : undefined
        }
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />
    </div>
  )
}
