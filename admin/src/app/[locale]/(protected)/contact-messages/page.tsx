"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { ContactMessageDialog } from "@/components/contact-messages/contact-message-dialog"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { useCursorList } from "@/hooks/use-cursor-list"
import { useQueryParam } from "@/hooks/use-query-param"
import { contactMessagesApi } from "@/lib/api/endpoints"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { ContactMessageOut } from "@/lib/api/types"

const STATUSES = ["new", "read", "closed"] as const

export default function ContactMessagesPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.contactView}>
      <ContactMessagesContent />
    </RequireRoutePermission>
  )
}

function ContactMessagesContent() {
  const t = useTranslations("contactMessages")
  const c = useTranslations("common")
  const format = useFormatter()

  const [statusParam, setStatusParam] = useQueryParam("status")
  const [viewing, setViewing] = useState<ContactMessageOut | null>(null)

  const list = useCursorList<ContactMessageOut>({
    queryKey: queryKeys.contactMessages.list({ status: statusParam }),
    fetchPage: (cursor, signal) =>
      contactMessagesApi.list({ cursor, limit: 25, status: statusParam }, signal),
  })

  const columns: ColumnDef<ContactMessageOut, unknown>[] = [
    {
      id: "from",
      header: t("columns.from"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.original.name}</span>
          <span className="text-xs text-muted-foreground" dir="ltr">
            {row.original.email}
          </span>
        </div>
      ),
    },
    {
      id: "subject",
      header: t("columns.subject"),
      cell: ({ row }) => (
        <div className="flex max-w-md flex-col">
          <span>{row.original.subject || t("noSubject")}</span>
          <span className="truncate text-xs text-muted-foreground">
            {row.original.message}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          label={t(`statuses.${row.original.status}`)}
        />
      ),
    },
    {
      id: "received",
      header: t("columns.received"),
      cell: ({ row }) => format.dateTime(new Date(row.original.created_at), "short"),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusParam ?? "all"}
          onValueChange={(next) => setStatusParam(next === "all" ? null : next)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={c("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{c("all")}</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`statuses.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(row) => setViewing(row)}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />

      {viewing && (
        <ContactMessageDialog
          key={viewing.id}
          message={viewing}
          open={!!viewing}
          onOpenChange={(open) => !open && setViewing(null)}
        />
      )}
    </div>
  )
}
