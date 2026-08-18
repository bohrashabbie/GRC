"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { MenuItemFormDialog } from "@/components/menus/menu-item-form-dialog"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { menusApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { MenuItemOut } from "@/lib/api/types"

export default function MenusPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.cmsView}>
      <MenusContent />
    </RequireRoutePermission>
  )
}

function MenusContent() {
  const t = useTranslations("menus")
  const c = useTranslations("common")
  const locale = useLocale()

  const queryClient = useQueryClient()
  const [editingItem, setEditingItem] = useState<MenuItemOut | undefined>()
  const [creatingIn, setCreatingIn] = useState<number | null>(null)
  const [deletingItem, setDeletingItem] = useState<MenuItemOut | null>(null)

  async function handleDeleteItem(item: MenuItemOut) {
    try {
      await menusApi.deleteItem(item.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.menus.all })
      toast.success(t("itemDeleted"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const menusQuery = useQuery({
    queryKey: queryKeys.menus.list(),
    queryFn: ({ signal }) => menusApi.list({ limit: 100 }, signal),
  })

  const menus = menusQuery.data?.items ?? []

  function labelOf(item: MenuItemOut): string {
    return (
      item.translations.find((tr) => tr.locale === locale)?.label ??
      item.translations[0]?.label ??
      `#${item.id}`
    )
  }

  function destination(item: MenuItemOut): string {
    return item.link_type === "url"
      ? item.link_url ?? "—"
      : `${t(`linkTypes.${item.link_type}`)} #${item.link_target_id ?? "?"}`
  }

  /** Top-level entries in order, each followed by its children. */
  function ordered(menu: (typeof menus)[number]): { item: MenuItemOut; depth: number }[] {
    const byParent = new Map<number | null, MenuItemOut[]>()
    for (const item of menu.items) {
      const list = byParent.get(item.parent_id) ?? []
      list.push(item)
      byParent.set(item.parent_id, list)
    }
    const sort = (list: MenuItemOut[]) =>
      [...list].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)

    const rows: { item: MenuItemOut; depth: number }[] = []
    for (const parent of sort(byParent.get(null) ?? [])) {
      rows.push({ item: parent, depth: 0 })
      for (const child of sort(byParent.get(parent.id) ?? [])) {
        rows.push({ item: child, depth: 1 })
      }
    }
    return rows
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: t("title") }]} />

      <PageHeader title={t("title")} description={t("description")} />

      {menusQuery.isLoading ? (
        <ListLoadingSkeleton />
      ) : menusQuery.isError ? (
        <ListErrorState error={menusQuery.error} onRetry={() => menusQuery.refetch()} />
      ) : menus.length === 0 ? (
        <ListEmptyState title={t("empty")} />
      ) : (
        <div className="flex flex-col gap-4">
          {menus.map((menu) => {
            const rows = ordered(menu)
            return (
              <Card key={menu.id}>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CardTitle>{menu.code}</CardTitle>
                    <StatusBadge
                      status={menu.is_active ? "active" : "inactive"}
                      label={menu.is_active ? c("active") : c("inactive")}
                    />
                  </div>
                  <RequirePermission permission={PERMISSIONS.cmsMenuManage}>
                    <Button size="sm" onClick={() => setCreatingIn(menu.id)}>
                      {t("newItem")}
                    </Button>
                  </RequirePermission>
                </CardHeader>

                <CardContent className="p-0">
                  {rows.length === 0 ? (
                    <p className="px-6 pb-6 text-sm text-muted-foreground">
                      {t("noItems")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto border-t border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("columns.item")}</TableHead>
                            <TableHead>{t("columns.destination")}</TableHead>
                            <TableHead>{c("status")}</TableHead>
                            <TableHead className="w-px">{c("actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map(({ item, depth }) => (
                            <TableRow key={item.id} className="even:bg-muted/30">
                              <TableCell className="font-medium text-foreground">
                                <span
                                  className="flex items-center gap-2"
                                  style={{ paddingInlineStart: depth * 20 }}
                                >
                                  {labelOf(item)}
                                  {item.badge_code && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal">
                                      {item.badge_code}
                                    </span>
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {destination(item)}
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={item.is_active ? "active" : "inactive"}
                                  label={item.is_active ? c("active") : c("inactive")}
                                />
                              </TableCell>
                              <TableCell className="w-px whitespace-nowrap">
                                <RequirePermission
                                  permission={PERMISSIONS.cmsMenuManage}
                                >
                                  <RowActions
                                    onEdit={() => setEditingItem(item)}
                                    onDelete={() => setDeletingItem(item)}
                                  />
                                </RequirePermission>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {editingItem && (
        <MenuItemFormDialog
          key={editingItem.id}
          menuId={editingItem.menu_id}
          item={editingItem}
          siblings={
            menus.find((m) => m.id === editingItem.menu_id)?.items ?? []
          }
          open
          onOpenChange={(open) => !open && setEditingItem(undefined)}
        />
      )}

      {creatingIn !== null && (
        <MenuItemFormDialog
          key={`new-${creatingIn}`}
          menuId={creatingIn}
          siblings={menus.find((m) => m.id === creatingIn)?.items ?? []}
          open
          onOpenChange={(open) => !open && setCreatingIn(null)}
        />
      )}

      {deletingItem && (
        <ConfirmDialog
          open={!!deletingItem}
          onOpenChange={(open) => !open && setDeletingItem(null)}
          title={t("deleteItemTitle", { label: labelOf(deletingItem) })}
          description={t("deleteItemDescription")}
          confirmLabel={c("delete")}
          onConfirm={() => handleDeleteItem(deletingItem)}
        />
      )}
    </div>
  )
}
