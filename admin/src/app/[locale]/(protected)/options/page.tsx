"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { OptionFormDialog } from "@/components/options/option-form-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { optionsApi } from "@/lib/api/endpoints"
import { translatedLabel } from "@/lib/format"
import { humanizeStatus } from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { useRouter } from "@/i18n/navigation"
import type { OptionOut } from "@/lib/api/types"

export default function OptionsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.catalogView}>
      <OptionsContent />
    </RequireRoutePermission>
  )
}

function OptionsContent() {
  const t = useTranslations("options")
  const c = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<OptionOut | undefined>()

  const list = useCursorList<OptionOut>({
    queryKey: queryKeys.options.list(),
    fetchPage: (cursor, signal) =>
      optionsApi.list({ cursor, limit: 50 }, signal),
  })

  const columns: ColumnDef<OptionOut, unknown>[] = [
    {
      id: "label",
      header: t("columns.label"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {translatedLabel(row.original.translations, locale)}
        </span>
      ),
    },
    {
      accessorKey: "input_type",
      header: t("columns.inputType"),
      cell: ({ row }) => (
        <Badge variant="outline">{humanizeStatus(row.original.input_type)}</Badge>
      ),
    },
    {
      id: "actions",
      header: c("actions"),
      // The row itself navigates to the option's values; RowActions stops the
      // click from reaching it.
      cell: ({ row }) => (
        <RequirePermission permission={PERMISSIONS.catalogManage}>
          <RowActions
            onEdit={() => {
              setEditing(row.original)
              setFormOpen(true)
            }}
          />
        </RequirePermission>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.catalogManage}>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              {t("newOption")}
            </Button>
          </RequirePermission>
        }
      />

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(option) => router.push(`/options/${option.id}`)}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />

      {formOpen && (
        <OptionFormDialog
          key={editing?.id ?? "new"}
          option={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}
    </div>
  )
}
