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
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQueryParam } from "@/hooks/use-query-param"
import { bannersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { BannerOut } from "@/lib/api/types"

const ALL = "__all__"
const PLACEMENTS = ["home_hero", "home_promo", "category_top", "checkout_strip"]

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

  const [placementParam, setPlacementParam] = useQueryParam("placement")
  const placement = placementParam ?? ALL

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BannerOut | undefined>()
  const [deactivating, setDeactivating] = useState<BannerOut | undefined>()

  const listParams = { placement: placement === ALL ? null : placement, is_active: null }
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

      <Select
        value={placement}
        onValueChange={(v) => setPlacementParam(v === ALL ? null : v)}
      >
        <SelectTrigger className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allPlacements")}</SelectItem>
          {PLACEMENTS.map((p) => (
            <SelectItem key={p} value={p}>
              {t(`placements.${p}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {bannersQuery.isLoading ? (
        <ListLoadingSkeleton />
      ) : bannersQuery.isError ? (
        <ListErrorState error={bannersQuery.error} onRetry={() => bannersQuery.refetch()} />
      ) : banners.length === 0 ? (
        <ListEmptyState title={t("empty")} />
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium">{headline(banner)}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`placements.${banner.placement}`)} · {t("fields.sortOrder")}{" "}
                    {banner.sort_order}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={banner.is_active ? "active" : "inactive"}
                    label={banner.is_active ? c("active") : c("inactive")}
                  />
                  <RequirePermission permission={PERMISSIONS.cmsBannerManage}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(banner)
                        setFormOpen(true)
                      }}
                    >
                      {c("edit")}
                    </Button>
                    {banner.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeactivating(banner)}
                      >
                        {c("deactivate")}
                      </Button>
                    )}
                  </RequirePermission>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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
