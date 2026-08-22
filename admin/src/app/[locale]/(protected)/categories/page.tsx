"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"
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

  // Which branches are folded shut. Kept here rather than in each row,
  // because the tree renders as one flat table.
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set())

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
  const visibleRows = flattenTree(liveTree, collapsed)

  function toggleBranch(categoryId: number) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(categoryId)) next.add(categoryId)
      return next
    })
  }

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
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.onHome")}</TableHead>
                <TableHead className="w-px">{c("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map(({ node, depth }) => {
                const name = translatedName(node.translations, locale)
                const hasChildren = node.children.length > 0
                const isCollapsed = collapsed.has(node.id)
                return (
                  <TableRow key={node.id} className="even:bg-muted/30">
                    <TableCell>
                      <div
                        className="flex items-center gap-2"
                        style={{ paddingInlineStart: depth * 1.5 + "rem" }}
                      >
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleBranch(node.id)}
                            aria-label={isCollapsed ? "Expand" : "Collapse"}
                            className="text-muted-foreground"
                          >
                            <ChevronRight
                              className={`size-3.5 transition-transform rtl:-scale-x-100 ${
                                isCollapsed ? "" : "rotate-90 rtl:-rotate-90"
                              }`}
                            />
                          </button>
                        ) : (
                          <span className="size-3.5" />
                        )}
                        <span className="font-medium text-foreground">
                          {name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {node.show_on_home ? (
                        <Badge variant="secondary">{c("yes")}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="w-px whitespace-nowrap">
                      <RequirePermission permission={PERMISSIONS.catalogManage}>
                        <RowActions
                          onEdit={() => openEdit(node.id)}
                          onDelete={() => setDeleting({ id: node.id, name })}
                        />
                      </RequirePermission>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

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

/** The tree as one list of rows, parents before their children, with the
 * children of a folded branch left out. Depth rides along so the name cell can
 * indent; the table itself stays flat, so every row's buttons land in the same
 * column as they do on every other listing. */
function flattenTree(
  nodes: CategoryTreeNode[],
  collapsed: ReadonlySet<number>,
  depth = 0
): { node: CategoryTreeNode; depth: number }[] {
  const rows: { node: CategoryTreeNode; depth: number }[] = []
  for (const node of nodes) {
    rows.push({ node, depth })
    if (node.children.length > 0 && !collapsed.has(node.id)) {
      rows.push(...flattenTree(node.children, collapsed, depth + 1))
    }
  }
  return rows
}
