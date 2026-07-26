"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { MenuFormDialog } from "@/components/menus/menu-form-dialog"
import { MenuItemFormDialog } from "@/components/menus/menu-item-form-dialog"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { menusApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { MenuItemOut, MenuOut } from "@/lib/api/types"

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

  const [menuFormOpen, setMenuFormOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<MenuOut | undefined>()
  const [itemForm, setItemForm] = useState<
    { menu: MenuOut; item?: MenuItemOut } | undefined
  >()
  const [removingItem, setRemovingItem] = useState<MenuItemOut | undefined>()

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
  function ordered(menu: MenuOut): { item: MenuItemOut; depth: number }[] {
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

  async function confirmRemoveItem() {
    if (!removingItem) return
    try {
      await menusApi.deactivateItem(removingItem.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.menus.all })
      toast.success(t("itemDeactivated"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setRemovingItem(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: t("title") }]} />

      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.cmsMenuManage}>
            <Button
              onClick={() => {
                setEditingMenu(undefined)
                setMenuFormOpen(true)
              }}
            >
              {t("newMenu")}
            </Button>
          </RequirePermission>
        }
      />

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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingMenu(menu)
                          setMenuFormOpen(true)
                        }}
                      >
                        {c("edit")}
                      </Button>
                      <Button size="sm" onClick={() => setItemForm({ menu })}>
                        {t("newItem")}
                      </Button>
                    </div>
                  </RequirePermission>
                </CardHeader>

                <CardContent className="p-0">
                  {rows.length === 0 ? (
                    <p className="px-6 pb-6 text-sm text-muted-foreground">
                      {t("noItems")}
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y">
                      {rows.map(({ item, depth }) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
                        >
                          <div
                            className="flex min-w-0 flex-col gap-0.5"
                            style={{ paddingInlineStart: depth * 20 }}
                          >
                            <span className="truncate text-sm font-medium">
                              {labelOf(item)}
                              {item.badge_code && (
                                <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                                  {item.badge_code}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {destination(item)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {!item.is_active && (
                              <StatusBadge status="inactive" label={c("inactive")} />
                            )}
                            <RequirePermission permission={PERMISSIONS.cmsMenuManage}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setItemForm({ menu, item })}
                              >
                                {c("edit")}
                              </Button>
                              {item.is_active && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRemovingItem(item)}
                                >
                                  {c("deactivate")}
                                </Button>
                              )}
                            </RequirePermission>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {menuFormOpen && (
        <MenuFormDialog
          key={editingMenu?.id ?? "new"}
          menu={editingMenu}
          open={menuFormOpen}
          onOpenChange={setMenuFormOpen}
        />
      )}

      {itemForm && (
        <MenuItemFormDialog
          key={itemForm.item?.id ?? `new-${itemForm.menu.id}`}
          menu={itemForm.menu}
          item={itemForm.item}
          open
          onOpenChange={(open) => !open && setItemForm(undefined)}
        />
      )}

      <ConfirmDialog
        open={!!removingItem}
        onOpenChange={(open) => !open && setRemovingItem(undefined)}
        title={t("deactivateItemTitle")}
        description={t("deactivateItemDescription", {
          name: removingItem ? labelOf(removingItem) : "",
        })}
        onConfirm={confirmRemoveItem}
      />
    </div>
  )
}
