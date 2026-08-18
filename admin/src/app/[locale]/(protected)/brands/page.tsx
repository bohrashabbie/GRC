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
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { BrandFormDialog } from "@/components/brands/brand-form-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { brandsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { useDeletionMessage } from "@/lib/deletion"
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
  const del = useTranslations("deletion")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BrandOut | undefined>()
  const [deleting, setDeleting] = useState<BrandOut | null>(null)
  const deletionMessage = useDeletionMessage()

  const list = useCursorList<BrandOut>({
    queryKey: queryKeys.brands.list({ is_active: true }),
    fetchPage: (cursor, signal) =>
      brandsApi.list({ cursor, limit: 20, is_active: true }, signal),
  })

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(brand: BrandOut) {
    setEditing(brand)
    setFormOpen(true)
  }

  async function handleDelete(brand: BrandOut) {
    const name = translatedName(brand.translations, locale)
    try {
      const result = await brandsApi.delete(brand.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.brands.all })
      toast.success(deletionMessage(result, name))
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
      id: "actions",
      header: c("actions"),
      cell: ({ row }) => (
        <RequirePermission permission={PERMISSIONS.catalogManage}>
          <RowActions
            onEdit={() => openEdit(row.original)}
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
          <RequirePermission permission={PERMISSIONS.catalogManage}>
            <Button onClick={openCreate}>{t("newBrand")}</Button>
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
        <BrandFormDialog
          key={editing?.id ?? "new"}
          brand={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={del("confirmTitle", {
            name: translatedName(deleting.translations, locale),
          })}
          description={del("confirmDescription")}
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  )
}
