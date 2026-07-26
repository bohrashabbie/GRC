"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { CategoryFormDialog } from "@/components/categories/category-form-dialog"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { useQueryParam } from "@/hooks/use-query-param"
import { categoriesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedName } from "@/lib/format"
import { CATEGORY_DIMENSIONS, humanizeStatus } from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { CategoryOut, CategoryTreeNode } from "@/lib/api/types"

export default function CategoriesPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.catalogView}>
      <CategoriesContent />
    </RequireRoutePermission>
  )
}

function CategoriesContent() {
  const t = useTranslations("categories")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [dimensionParam, setDimensionParam] = useQueryParam("dimension")
  const dimension = dimensionParam ?? CATEGORY_DIMENSIONS[0]

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryOut | undefined>()
  const [deactivating, setDeactivating] = useState<{
    id: number
    name: string
  } | null>(null)

  const treeQuery = useQuery({
    queryKey: queryKeys.categories.tree(dimension),
    queryFn: ({ signal }) => categoriesApi.tree(dimension, signal),
  })

  async function openEdit(categoryId: number) {
    // The tree endpoint returns a trimmed node; the form needs the full record
    // (parent_id, code, sort_order), so fetch it before opening.
    try {
      const full = await categoriesApi.get(categoryId)
      setEditing(full)
      setFormOpen(true)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  async function handleDeactivate(categoryId: number) {
    try {
      await categoriesApi.deactivate(categoryId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      toast.success(t("deactivated"))
    } catch (error) {
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
            <Button onClick={openCreate}>{t("newCategory")}</Button>
          </RequirePermission>
        }
      />

      <Select
        value={dimension}
        onValueChange={(next) =>
          setDimensionParam(
            !next || next === CATEGORY_DIMENSIONS[0] ? null : next
          )
        }
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder={t("fields.dimension")} />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_DIMENSIONS.map((d) => (
            <SelectItem key={d} value={d}>
              {humanizeStatus(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Card>
        <CardHeader>
          <CardTitle>{t("treeTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {treeQuery.isLoading && <ListLoadingSkeleton rows={5} />}
          {treeQuery.isError && (
            <ListErrorState
              error={treeQuery.error}
              onRetry={() => treeQuery.refetch()}
            />
          )}
          {treeQuery.data && treeQuery.data.length === 0 && (
            <ListEmptyState description={t("empty")} />
          )}
          {treeQuery.data && treeQuery.data.length > 0 && (
            <ul className="flex flex-col gap-1">
              {treeQuery.data.map((node) => (
                <CategoryTreeRow
                  key={node.id}
                  node={node}
                  locale={locale}
                  onEdit={openEdit}
                  onDeactivate={(id, name) => setDeactivating({ id, name })}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <CategoryFormDialog
          key={editing?.id ?? "new"}
          category={editing}
          defaultDimension={dimension}
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
          onConfirm={() => handleDeactivate(deactivating.id)}
        />
      )}
    </div>
  )
}

/** One node plus its children, indented by depth. Recursion mirrors the
 * nested shape the /categories/tree endpoint already returns. */
function CategoryTreeRow({
  node,
  locale,
  onEdit,
  onDeactivate,
}: {
  node: CategoryTreeNode
  locale: string
  onEdit: (id: number) => void
  onDeactivate: (id: number, name: string) => void
}) {
  const c = useTranslations("common")
  const [expanded, setExpanded] = useState(true)
  const name = translatedName(node.translations, locale)
  const hasChildren = node.children.length > 0

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50"
        style={{ paddingInlineStart: `${node.depth * 1.25 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="text-muted-foreground"
          >
            <ChevronRight
              className={`size-3.5 transition-transform rtl:-scale-x-100 ${
                expanded ? "rotate-90 rtl:-rotate-90" : ""
              }`}
            />
          </button>
        ) : (
          <span className="size-3.5" />
        )}

        <span className="flex-1 truncate text-sm font-medium text-foreground">
          {name}
        </span>
        <code className="text-xs text-muted-foreground">{node.code}</code>
        {!node.is_active && (
          <StatusBadge status="archived" label={c("inactive")} />
        )}

        <RequirePermission permission={PERMISSIONS.catalogManage}>
          <div className="flex gap-1.5">
            <Button variant="outline" size="xs" onClick={() => onEdit(node.id)}>
              {c("edit")}
            </Button>
            {node.is_active && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onDeactivate(node.id, name)}
              >
                {c("deactivate")}
              </Button>
            )}
          </div>
        </RequirePermission>
      </div>

      {hasChildren && expanded && (
        <ul className="flex flex-col gap-1">
          {node.children.map((child) => (
            <CategoryTreeRow
              key={child.id}
              node={child}
              locale={locale}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
