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
import { ProductTypeFormDialog } from "@/components/product-types/product-type-form-dialog"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { productTypesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedLabel } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { ProductTypeOut } from "@/lib/api/types"

export default function ProductTypesPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.catalogView}>
      <ProductTypesContent />
    </RequireRoutePermission>
  )
}

function ProductTypesContent() {
  const t = useTranslations("productTypes")
  const c = useTranslations("common")
  const del = useTranslations("deletion")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProductTypeOut | undefined>()
  const [deleting, setDeleting] = useState<ProductTypeOut | null>(null)

  const typesQuery = useQuery({
    queryKey: queryKeys.productTypes.list(),
    queryFn: ({ signal }) => productTypesApi.list({}, signal),
  })
  const types = typesQuery.data ?? []

  async function handleDelete(productType: ProductTypeOut) {
    try {
      await productTypesApi.delete(productType.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.productTypes.all })
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
                <TableHead>{t("columns.products")}</TableHead>
                <TableHead>{t("columns.order")}</TableHead>
                <TableHead>{c("status")}</TableHead>
                <TableHead className="w-px">{c("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((productType) => (
                <TableRow key={productType.id} className="even:bg-muted/30">
                  <TableCell className="font-medium text-foreground">
                    {translatedLabel(productType.translations, locale)}
                  </TableCell>
                  <TableCell>
                    {productType.product_count > 0 ? (
                      <Badge variant="outline">
                        {t("productCount", { count: productType.product_count })}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {productType.sort_order}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={productType.is_active ? "active" : "inactive"}
                      label={productType.is_active ? c("active") : c("inactive")}
                    />
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap">
                    <RequirePermission permission={PERMISSIONS.catalogManage}>
                      <RowActions
                        onEdit={() => {
                          setEditing(productType)
                          setFormOpen(true)
                        }}
                        onDelete={() => setDeleting(productType)}
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
        <ProductTypeFormDialog
          key={editing?.id ?? "new"}
          productType={editing}
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
            deleting.product_count > 0
              ? t("deleteBlocked", { count: deleting.product_count })
              : del("confirmDescription")
          }
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  )
}
