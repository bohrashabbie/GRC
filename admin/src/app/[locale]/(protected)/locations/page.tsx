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
import { StatusBadge } from "@/components/status-badge"
import { StatusFilter, useStatusFilter } from "@/components/status-filter"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { LocationFormDialog } from "@/components/locations/location-form-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { locationsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
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
  const locale = useLocale()
  const queryClient = useQueryClient()

  const { status, setStatus, isActive } = useStatusFilter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LocationOut | undefined>()
  const [deactivating, setDeactivating] = useState<LocationOut | null>(null)

  const list = useCursorList<LocationOut>({
    queryKey: queryKeys.locations.list({ is_active: isActive }),
    fetchPage: (cursor, signal) =>
      locationsApi.list({ cursor, limit: 50, is_active: isActive }, signal),
  })

  async function handleDeactivate(location: LocationOut) {
    try {
      await locationsApi.deactivate(location.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
      toast.success(t("deactivated"))
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
        <RequirePermission permission={PERMISSIONS.locationManage}>
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
        <LocationFormDialog
          key={editing?.id ?? "new"}
          location={editing}
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
            name: bilingualName(deactivating, locale),
          })}
          onConfirm={() => handleDeactivate(deactivating)}
        />
      )}
    </div>
  )
}
