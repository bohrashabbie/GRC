"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { LocationTypeFormDialog } from "@/components/location-types/location-type-form-dialog"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { locationTypesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedLabel } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { LocationTypeOut } from "@/lib/api/types"

export default function LocationTypesPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.inventoryView}>
      <LocationTypesContent />
    </RequireRoutePermission>
  )
}

function LocationTypesContent() {
  const t = useTranslations("locationTypes")
  const c = useTranslations("common")
  const del = useTranslations("deletion")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LocationTypeOut | undefined>()
  const [deleting, setDeleting] = useState<LocationTypeOut | null>(null)

  const typesQuery = useQuery({
    queryKey: queryKeys.locationTypes.list(),
    queryFn: ({ signal }) => locationTypesApi.list({}, signal),
  })
  const types = typesQuery.data ?? []

  async function handleDelete(locationType: LocationTypeOut) {
    try {
      await locationTypesApi.delete(locationType.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.locationTypes.all })
      toast.success(t("deleted"))
    } catch (error) {
      // The API refuses while products still carry the type and says how many,
      // so its message is more useful than anything written here.
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

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
              {t("newType")}
            </Button>
          </RequirePermission>
        }
      />

      {typesQuery.isLoading && <ListLoadingSkeleton rows={4} />}
      {typesQuery.isError && (
        <ListErrorState
          error={typesQuery.error}
          onRetry={() => typesQuery.refetch()}
        />
      )}
      {typesQuery.data && types.length === 0 && (
        <ListEmptyState description={t("empty")} />
      )}

      {types.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.locations")}</TableHead>
                <TableHead>{t("columns.order")}</TableHead>
                <TableHead>{c("status")}</TableHead>
                <TableHead className="w-px">{c("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((locationType) => (
                <TableRow key={locationType.id} className="even:bg-muted/30">
                  <TableCell className="font-medium text-foreground">
                    {translatedLabel(locationType.translations, locale)}
                  </TableCell>
                  <TableCell>
                    {locationType.location_count > 0 ? (
                      <Badge variant="outline">
                        {t("locationCount", { count: locationType.location_count })}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {locationType.sort_order}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={locationType.is_active ? "active" : "inactive"}
                      label={locationType.is_active ? c("active") : c("inactive")}
                    />
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap">
                    <RequirePermission permission={PERMISSIONS.locationManage}>
                      <RowActions
                        onEdit={() => {
                          setEditing(locationType)
                          setFormOpen(true)
                        }}
                        onDelete={() => setDeleting(locationType)}
                      />
                    </RequirePermission>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {formOpen && (
        <LocationTypeFormDialog
          key={editing?.id ?? "new"}
          locationType={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={del("confirmTitle", {
            name: translatedLabel(deleting.translations, locale),
          })}
          description={
            deleting.location_count > 0
              ? t("deleteBlocked", { count: deleting.location_count })
              : del("confirmDescription")
          }
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  )
}
