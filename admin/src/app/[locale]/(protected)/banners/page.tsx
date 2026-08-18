"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { BannerFormDialog } from "@/components/banners/banner-form-dialog"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { bannersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { BannerOut } from "@/lib/api/types"

export default function BannersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.cmsView}>
      <BannersContent />
    </RequireRoutePermission>
  )
}

function BannersContent() {
  const t = useTranslations("banners")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BannerOut | undefined>()
  const [deactivating, setDeactivating] = useState<BannerOut | undefined>()

  const listParams = { placement: "home_hero", is_active: null }
  const bannersQuery = useQuery({
    queryKey: queryKeys.banners.list(listParams),
    queryFn: ({ signal }) =>
      bannersApi.list({ ...listParams, limit: 100 }, signal),
  })

  const banners = bannersQuery.data?.items ?? []

  function headline(banner: BannerOut): string {
    const row =
      banner.translations.find((tr) => tr.locale === locale) ??
      banner.translations.find((tr) => tr.headline) ??
      banner.translations[0]
    return row?.headline || t("untitled")
  }

  async function confirmDeactivate() {
    if (!deactivating) return
    try {
      await bannersApi.deactivate(deactivating.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.banners.all })
      toast.success(t("deactivated"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setDeactivating(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: t("title") }]} />

      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.cmsBannerManage}>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              {t("newBanner")}
            </Button>
          </RequirePermission>
        }
      />

      {bannersQuery.isLoading ? (
        <ListLoadingSkeleton />
      ) : bannersQuery.isError ? (
        <ListErrorState error={bannersQuery.error} onRetry={() => bannersQuery.refetch()} />
      ) : banners.length === 0 ? (
        <ListEmptyState title={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.banner")}</TableHead>
                <TableHead>{t("columns.placement")}</TableHead>
                <TableHead>{t("columns.order")}</TableHead>
                <TableHead>{c("status")}</TableHead>
                <TableHead className="w-px">{c("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner.id} className="even:bg-muted/30">
                  <TableCell className="font-medium text-foreground">
                    {headline(banner)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t("placements.home_hero")}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {banner.sort_order}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={banner.is_active ? "active" : "inactive"}
                      label={banner.is_active ? c("active") : c("inactive")}
                    />
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap">
                    <RequirePermission permission={PERMISSIONS.cmsBannerManage}>
                      <RowActions
                        onEdit={() => {
                          setEditing(banner)
                          setFormOpen(true)
                        }}
                        extra={
                          banner.is_active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeactivating(banner)}
                            >
                              {c("deactivate")}
                            </Button>
                          ) : null
                        }
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
        <BannerFormDialog
          // Remount per record so the uncontrolled initial state is right.
          key={editing?.id ?? "new"}
          banner={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(open) => !open && setDeactivating(undefined)}
        title={t("deactivateTitle")}
        description={t("deactivateDescription", {
          name: deactivating ? headline(deactivating) : "",
        })}
        onConfirm={confirmDeactivate}
      />
    </div>
  )
}
