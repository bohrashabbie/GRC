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
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
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
import { useDeletionMessage } from "@/lib/deletion"
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
  const del = useTranslations("deletion")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [dimensionParam, setDimensionParam] = useQueryParam("dimension")
  const dimension = dimensionParam ?? CATEGORY_DIMENSIONS[0]

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryOut | undefined>()
  const [deleting, setDeleting] = useState<{
    id: number
    name: string
  } | null>(null)
  const deletionMessage = useDeletionMessage()

  const treeQuery = useQuery({
    queryKey: queryKeys.categories.tree(dimension),
    queryFn: ({ signal }) => categoriesApi.tree(dimension, signal),
  })

  // A delete that could not remove the row deactivates it instead. The tree
  // endpoint still returns those, and with no active/inactive badge left they
  // would look identical to live categories — so they are dropped here and the
  // delete reads as a delete. Pruning a branch takes its children with it,
  // which matches the API refusing to delete a parent that still has any.
  const liveTree = pruneInactive(treeQuery.data ?? [])

  async function openEdit(categoryId: number) {
    // The tree endpoint returns a trimmed node; the form needs the full record
    // (parent_id, sort_order), so fetch it before opening.
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

  async function handleDelete(categoryId: number, name: string) {
    try {
      const result = await categoriesApi.delete(categoryId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      toast.success(deletionMessage(result, name))
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
          {treeQuery.data && liveTree.length === 0 && (
            <ListEmptyState description={t("empty")} />
          )}
          {treeQuery.data && liveTree.length > 0 && (
            <ul className="flex flex-col gap-1">
              {liveTree.map((node) => (
                <CategoryTreeRow
                  key={node.id}
                  node={node}
                  locale={locale}
                  onEdit={openEdit}
                  onDelete={(id, name) => setDeleting({ id, name })}
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

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={del("confirmTitle", { name: deleting.name })}
          description={del("confirmDescription")}
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting.id, deleting.name)}
        />
      )}
    </div>
  )
}

/** Drops deactivated categories, and with them their whole branch. */
function pruneInactive(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  return nodes
    .filter((node) => node.is_active)
    .map((node) => ({ ...node, children: pruneInactive(node.children) }))
}

/** One node plus its children, indented by depth. Recursion mirrors the
 * nested shape the /categories/tree endpoint already returns. */
function CategoryTreeRow({
  node,
  locale,
  onEdit,
  onDelete,
}: {
  node: CategoryTreeNode
  locale: string
  onEdit: (id: number) => void
  onDelete: (id: number, name: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const name = translatedName(node.translations, locale)
  const hasChildren = node.children.length > 0

  return (
    <li>
      <div className="flex items-center gap-3 rounded-lg py-1.5 pe-2 hover:bg-muted/50">
        {/* The indent lives inside a fixed-width name column, so every row's
            buttons line up in one strip however deep the branch is - close to
            the name they act on, and never a page-width away from it. */}
        <div
          className="flex min-w-0 items-center gap-2 sm:w-96"
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
          <span className="truncate text-sm font-medium text-foreground">
            {name}
          </span>
        </div>
        <RequirePermission permission={PERMISSIONS.catalogManage}>
          <RowActions
            onEdit={() => onEdit(node.id)}
            onDelete={() => onDelete(node.id, name)}
          />
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
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
