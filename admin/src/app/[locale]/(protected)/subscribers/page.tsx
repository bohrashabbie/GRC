"use client"

import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { useCursorList } from "@/hooks/use-cursor-list"
import { newsletterApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { SubscriberOut } from "@/lib/api/types"

export default function SubscribersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.contactView}>
      <SubscribersContent />
    </RequireRoutePermission>
  )
}

function SubscribersContent() {
  const t = useTranslations("subscribers")
  const c = useTranslations("common")
  const format = useFormatter()
  const queryClient = useQueryClient()
  const [removing, setRemoving] = useState<SubscriberOut | null>(null)

  const list = useCursorList<SubscriberOut>({
    queryKey: queryKeys.subscribers.list(),
    fetchPage: (cursor, signal) =>
      newsletterApi.list({ cursor, limit: 50 }, signal),
  })

  async function handleUnsubscribe(subscriber: SubscriberOut) {
    try {
      await newsletterApi.unsubscribe(subscriber.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.subscribers.all })
      toast.success(t("unsubscribed"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const columns: ColumnDef<SubscriberOut, unknown>[] = [
    {
      accessorKey: "email",
      header: t("columns.email"),
      cell: ({ row }) => (
        <span dir="ltr" className="font-medium text-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "locale",
      header: t("columns.language"),
      cell: ({ row }) => (
        <Badge variant="outline">{t(`languages.${row.original.locale}`)}</Badge>
      ),
    },
    {
      accessorKey: "source",
      header: t("columns.source"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.source}</span>
      ),
    },
    {
      id: "status",
      header: c("status"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.unsubscribed_at ? "archived" : "active"}
          label={row.original.unsubscribed_at ? t("optedOut") : t("subscribed")}
        />
      ),
    },
    {
      accessorKey: "created_at",
      header: t("columns.joined"),
      cell: ({ row }) =>
        format.dateTime(new Date(row.original.created_at), "short"),
    },
    {
      id: "actions",
      header: c("actions"),
      // Opting someone out is a flag, not a delete — an address that left has
      // to stay on record so an import cannot put it back.
      cell: ({ row }) =>
        row.original.unsubscribed_at ? null : (
          <RequirePermission permission={PERMISSIONS.contactManage}>
            <RowActions
              onDelete={() => setRemoving(row.original)}
              deleteLabel={t("unsubscribe")}
            />
          </RequirePermission>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />

      {removing && (
        <ConfirmDialog
          open={!!removing}
          onOpenChange={(open) => !open && setRemoving(null)}
          title={t("unsubscribeTitle")}
          description={t("unsubscribeDescription", { email: removing.email })}
          confirmLabel={t("unsubscribe")}
          onConfirm={() => handleUnsubscribe(removing)}
        />
      )}
    </div>
  )
}
