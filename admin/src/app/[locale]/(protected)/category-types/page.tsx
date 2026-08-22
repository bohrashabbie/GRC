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
import { CategoryTypeFormDialog } from "@/components/category-types/category-type-form-dialog"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { categoryTypesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedLabel } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { CategoryTypeOut } from "@/lib/api/types"

export default function CategoryTypesPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.catalogView}>
      <CategoryTypesContent />
    </RequireRoutePermission>
  )
}

function CategoryTypesContent() {
  const t = useTranslations("categoryTypes")
  const c = useTranslations("common")
  const del = useTranslations("deletion")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryTypeOut | undefined>()
  const [deleting, setDeleting] = useState<CategoryTypeOut | null>(null)

  const typesQuery = useQuery({
    queryKey: queryKeys.categoryTypes.list(),
    queryFn: ({ signal }) => categoryTypesApi.list({}, signal),
  })
  const types = typesQuery.data ?? []

  async function handleDelete(categoryType: CategoryTypeOut) {
    try {
      await categoryTypesApi.delete(categoryType.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.categoryTypes.all })
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
          <RequirePermission permission={PERMISSIONS.catalogManage}>
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
                <TableHead>{t("columns.categories")}</TableHead>
                <TableHead>{t("columns.order")}</TableHead>
                <TableHead>{c("status")}</TableHead>
                <TableHead className="w-px">{c("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((categoryType) => (
                <TableRow key={categoryType.id} className="even:bg-muted/30">
                  <TableCell className="font-medium text-foreground">
                    {translatedLabel(categoryType.translations, locale)}
                  </TableCell>
                  <TableCell>
                    {categoryType.category_count > 0 ? (
                      <Badge variant="outline">
                        {t("categoryCount", { count: categoryType.category_count })}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {categoryType.sort_order}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={categoryType.is_active ? "active" : "inactive"}
                      label={categoryType.is_active ? c("active") : c("inactive")}
                    />
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap">
                    <RequirePermission permission={PERMISSIONS.catalogManage}>
                      <RowActions
                        onEdit={() => {
                          setEditing(categoryType)
                          setFormOpen(true)
                        }}
                        onDelete={() => setDeleting(categoryType)}
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
        <CategoryTypeFormDialog
          key={editing?.id ?? "new"}
          categoryType={editing}
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
            deleting.category_count > 0
              ? t("deleteBlocked", { count: deleting.category_count })
              : del("confirmDescription")
          }
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  )
}
