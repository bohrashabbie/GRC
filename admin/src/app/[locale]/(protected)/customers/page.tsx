"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "next-intl"

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
import { queryKeys } from "@/lib/query/keys"
import { useRouter } from "@/i18n/navigation"
import type { CustomerOut } from "@/lib/api/types"

export default function CustomersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.customerView}>
      <CustomersContent />
    </RequireRoutePermission>
  )
}

function CustomersContent() {
  const t = useTranslations("customers")
  const c = useTranslations("common")
  const format = useFormatter()
  const router = useRouter()

  const { status, setStatus, isActive } = useStatusFilter()

  const list = useCursorList<CustomerOut>({
    queryKey: queryKeys.customers.list({ is_active: isActive }),
    fetchPage: (cursor, signal) =>
      customersApi.list({ cursor, limit: 20, is_active: isActive }, signal),
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
      accessorKey: "created_at",
      header: t("columns.created"),
      cell: ({ row }) =>
        format.dateTime(new Date(row.original.created_at), "short"),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      <StatusFilter value={status} onChange={setStatus} />

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
