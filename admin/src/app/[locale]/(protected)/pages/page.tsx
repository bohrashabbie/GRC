"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageFormDialog } from "@/components/pages/page-form-dialog"
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
import { pagesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { PageOut } from "@/lib/api/types"

export default function PagesPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.cmsView}>
      <PagesContent />
    </RequireRoutePermission>
  )
}

function PagesContent() {
  const t = useTranslations("pages")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PageOut | undefined>()
  const [unpublishing, setUnpublishing] = useState<PageOut | undefined>()

  // Pages are seeded, not staff-created — there is no "new page" action.

  const pagesQuery = useQuery({
    queryKey: queryKeys.pages.list({ status: null }),
    queryFn: ({ signal }) => pagesApi.list({ limit: 100 }, signal),
  })

  const items = pagesQuery.data?.items ?? []

  function title(page: PageOut): string {
    const row =
      page.translations.find((tr) => tr.locale === locale) ?? page.translations[0]
    return row?.title || page.code
  }

  function slug(page: PageOut): string {
    const row =
      page.translations.find((tr) => tr.locale === locale) ?? page.translations[0]
    return row?.slug ? `/pages/${row.slug}` : "—"
  }

  async function confirmUnpublish() {
    if (!unpublishing) return
    try {
      await pagesApi.unpublish(unpublishing.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages.all })
      toast.success(t("unpublished"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setUnpublishing(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: t("title") }]} />

      <PageHeader title={t("title")} description={t("description")} />

      {pagesQuery.isLoading ? (
        <ListLoadingSkeleton />
      ) : pagesQuery.isError ? (
        <ListErrorState error={pagesQuery.error} onRetry={() => pagesQuery.refetch()} />
      ) : items.length === 0 ? (
        <ListEmptyState title={t("empty")} />
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {items.map((page) => (
              <div
                key={page.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium">{title(page)}</span>
                  <span className="text-xs text-muted-foreground">
                    {page.code} · {slug(page)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={page.status === "published" ? "active" : "inactive"}
                    label={t(`statuses.${page.status}`)}
                  />
                  <RequirePermission permission={PERMISSIONS.cmsPageManage}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(page)
                        setFormOpen(true)
                      }}
                    >
                      {c("edit")}
                    </Button>
                  </RequirePermission>
                  {page.status === "published" && (
                    <RequirePermission permission={PERMISSIONS.cmsPagePublish}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUnpublishing(page)}
                      >
                        {t("unpublish")}
                      </Button>
                    </RequirePermission>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {formOpen && editing && (
        <PageFormDialog
          key={editing.id}
          page={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}

      <ConfirmDialog
        open={!!unpublishing}
        onOpenChange={(open) => !open && setUnpublishing(undefined)}
        title={t("unpublishTitle")}
        description={t("unpublishDescription", {
          name: unpublishing ? title(unpublishing) : "",
        })}
        onConfirm={confirmUnpublish}
      />
    </div>
  )
}
