"use client"

import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { StatusFilter, useStatusFilter } from "@/components/status-filter"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { suppliersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { SupplierOut } from "@/lib/api/types"

export default function SuppliersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.supplierManage}>
      <SuppliersContent />
    </RequireRoutePermission>
  )
}

function SuppliersContent() {
  const t = useTranslations("suppliers")
  const c = useTranslations("common")
  const queryClient = useQueryClient()

  const { status, setStatus, isActive } = useStatusFilter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierOut | undefined>()
  const [deactivating, setDeactivating] = useState<SupplierOut | null>(null)

  const list = useCursorList<SupplierOut>({
    queryKey: queryKeys.suppliers.list({ is_active: isActive }),
    fetchPage: (cursor, signal) =>
      suppliersApi.list({ cursor, limit: 20, is_active: isActive }, signal),
  })

  async function handleDeactivate(supplier: SupplierOut) {
    try {
      await suppliersApi.deactivate(supplier.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      toast.success(t("deactivated"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const columns: ColumnDef<SupplierOut, unknown>[] = [
    {
      accessorKey: "name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "code",
      header: t("columns.code"),
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">{row.original.code}</code>
      ),
    },
    {
      id: "contact",
      header: t("columns.contact"),
      cell: ({ row }) => (
        <div className="flex flex-col text-xs">
          <span>{row.original.contact_name ?? "—"}</span>
          <span className="text-muted-foreground">
            {row.original.email ?? row.original.phone_e164 ?? ""}
          </span>
        </div>
      ),
    },
    {
      id: "terms",
      header: t("columns.terms"),
      cell: ({ row }) =>
        row.original.payment_terms_days === null
          ? "—"
          : `${row.original.payment_terms_days}d`,
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
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RequirePermission permission={PERMISSIONS.supplierManage}>
          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setEditing(row.original)
                setFormOpen(true)
              }}
            >
              {c("edit")}
            </Button>
            {row.original.is_active && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setDeactivating(row.original)}
              >
                {c("deactivate")}
              </Button>
            )}
          </div>
        </RequirePermission>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.supplierManage}>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              {t("newSupplier")}
            </Button>
          </RequirePermission>
        }
      />

      <StatusFilter value={status} onChange={setStatus} />

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />

      {formOpen && (
        <SupplierFormDialog
          key={editing?.id ?? "new"}
          supplier={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          open={!!deactivating}
          onOpenChange={(open) => !open && setDeactivating(null)}
          title={t("deactivateTitle")}
          description={t("deactivateDescription", { name: deactivating.name })}
          onConfirm={() => handleDeactivate(deactivating)}
        />
      )}
    </div>
  )
}
