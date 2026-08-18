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
import { pagesApi } from "@/lib/api/endpoints"
import { useDeletionMessage } from "@/lib/deletion"
import { usePermission } from "@/hooks/use-permission"
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
  const del = useTranslations("deletion")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PageOut | undefined>()
  const [unpublishing, setUnpublishing] = useState<PageOut | undefined>()
  const [deleting, setDeleting] = useState<PageOut | null>(null)
  const deletionMessage = useDeletionMessage()
  const canManage = usePermission(PERMISSIONS.cmsPageManage)
  const canPublish = usePermission(PERMISSIONS.cmsPagePublish)

  async function handleDelete(page: PageOut) {
    try {
      const result = await pagesApi.delete(page.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages.all })
      toast.success(deletionMessage(result, title(page)))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

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

      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.cmsPageManage}>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              {t("newPage")}
            </Button>
          </RequirePermission>
        }
      />

      {pagesQuery.isLoading ? (
        <ListLoadingSkeleton />
      ) : pagesQuery.isError ? (
        <ListErrorState error={pagesQuery.error} onRetry={() => pagesQuery.refetch()} />
      ) : items.length === 0 ? (
        <ListEmptyState title={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.page")}</TableHead>
                <TableHead>{t("columns.slug")}</TableHead>
                <TableHead>{c("status")}</TableHead>
                <TableHead className="w-px">{c("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((page) => (
                <TableRow key={page.id} className="even:bg-muted/30">
                  <TableCell className="font-medium text-foreground">
                    {title(page)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {slug(page)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={page.status === "published" ? "active" : "inactive"}
                      label={t(`statuses.${page.status}`)}
                    />
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap">
                    <RowActions
                      onEdit={
                        canManage
                          ? () => {
                              setEditing(page)
                              setFormOpen(true)
                            }
                          : undefined
                      }
                      onDelete={canPublish ? () => setDeleting(page) : undefined}
                      extra={
                        canPublish && page.status === "published" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUnpublishing(page)}
                          >
                            {t("unpublish")}
                          </Button>
                        ) : null
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {formOpen && (
        <PageFormDialog
          key={editing?.id ?? "new"}
          page={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={del("confirmTitle", { name: title(deleting) })}
          description={del("confirmDescription")}
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting)}
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
