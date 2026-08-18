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
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { suppliersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { useDeletionMessage } from "@/lib/deletion"
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
  const del = useTranslations("deletion")
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierOut | undefined>()
  const [deleting, setDeleting] = useState<SupplierOut | null>(null)
  const deletionMessage = useDeletionMessage()

  const list = useCursorList<SupplierOut>({
    queryKey: queryKeys.suppliers.list({ is_active: true }),
    fetchPage: (cursor, signal) =>
      suppliersApi.list({ cursor, limit: 20, is_active: true }, signal),
  })

  async function handleDelete(supplier: SupplierOut) {
    const name = supplier.name
    try {
      const result = await suppliersApi.delete(supplier.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      toast.success(deletionMessage(result, name))
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
      id: "actions",
      header: c("actions"),
      cell: ({ row }) => (
        <RequirePermission permission={PERMISSIONS.supplierManage}>
          <RowActions
            onEdit={() => {
              setEditing(row.original)
              setFormOpen(true)
            }}
            onDelete={() => setDeleting(row.original)}
          />
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

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={del("confirmTitle", { name: deleting.name })}
          description={del("confirmDescription")}
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  )
}
