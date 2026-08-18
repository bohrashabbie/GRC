"use client"

import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { LocationFormDialog } from "@/components/locations/location-form-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { locationsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { useDeletionMessage } from "@/lib/deletion"
import { bilingualName } from "@/lib/format"
import { humanizeStatus } from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { LocationOut } from "@/lib/api/types"

export default function LocationsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.inventoryView}>
      <LocationsContent />
    </RequireRoutePermission>
  )
}

function LocationsContent() {
  const t = useTranslations("locations")
  const c = useTranslations("common")
  const del = useTranslations("deletion")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LocationOut | undefined>()
  const [deleting, setDeleting] = useState<LocationOut | null>(null)
  const deletionMessage = useDeletionMessage()

  const list = useCursorList<LocationOut>({
    queryKey: queryKeys.locations.list({ is_active: true }),
    fetchPage: (cursor, signal) =>
      locationsApi.list({ cursor, limit: 50, is_active: true }, signal),
  })

  async function handleDelete(location: LocationOut) {
    const name = bilingualName(location, locale)
    try {
      const result = await locationsApi.delete(location.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
      toast.success(deletionMessage(result, name))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const columns: ColumnDef<LocationOut, unknown>[] = [
    {
      id: "name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {bilingualName(row.original, locale)}
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
      accessorKey: "type",
      header: t("columns.type"),
      cell: ({ row }) => (
        <Badge variant="outline">{humanizeStatus(row.original.type)}</Badge>
      ),
    },
    {
      accessorKey: "fulfilment_priority",
      header: t("columns.priority"),
    },
    {
      id: "actions",
      header: c("actions"),
      cell: ({ row }) => (
        <RequirePermission permission={PERMISSIONS.locationManage}>
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
          <RequirePermission permission={PERMISSIONS.locationManage}>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              {t("newLocation")}
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
        <LocationFormDialog
          key={editing?.id ?? "new"}
          location={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={del("confirmTitle", { name: bilingualName(deleting, locale) })}
          description={del("confirmDescription")}
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  )
}
