"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { BrandFormDialog } from "@/components/brands/brand-form-dialog"
import { StatusFilter, useStatusFilter } from "@/components/status-filter"
import { useCursorList } from "@/hooks/use-cursor-list"
import { brandsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedName } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { BrandOut } from "@/lib/api/types"

export default function BrandsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.catalogView}>
      <BrandsContent />
    </RequireRoutePermission>
  )
}

function BrandsContent() {
  const t = useTranslations("brands")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const { status, setStatus, isActive } = useStatusFilter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BrandOut | undefined>()
  const [deactivating, setDeactivating] = useState<BrandOut | null>(null)

  const list = useCursorList<BrandOut>({
    queryKey: queryKeys.brands.list({ is_active: isActive }),
    fetchPage: (cursor, signal) =>
      brandsApi.list({ cursor, limit: 20, is_active: isActive }, signal),
  })

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(brand: BrandOut) {
    setEditing(brand)
    setFormOpen(true)
  }

  async function handleDeactivate(brand: BrandOut) {
    try {
      await brandsApi.deactivate(brand.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.brands.all })
      toast.success(t("deactivated"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const columns: ColumnDef<BrandOut, unknown>[] = [
    {
      id: "name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {translatedName(row.original.translations, locale)}
        </span>
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
      accessorKey: "sort_order",
      header: t("columns.sortOrder"),
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
        <RequirePermission permission={PERMISSIONS.catalogManage}>
          <div className="flex justify-end gap-1.5">
            <Button variant="outline" size="xs" onClick={() => openEdit(row.original)}>
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
          <RequirePermission permission={PERMISSIONS.catalogManage}>
            <Button onClick={openCreate}>{t("newBrand")}</Button>
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
        <BrandFormDialog
          key={editing?.id ?? "new"}
          brand={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          open={!!deactivating}
          onOpenChange={(open) => !open && setDeactivating(null)}
          title={t("deactivateTitle")}
          description={t("deactivateDescription", {
            name: translatedName(deactivating.translations, locale),
          })}
          onConfirm={() => handleDeactivate(deactivating)}
        />
      )}
    </div>
  )
}
