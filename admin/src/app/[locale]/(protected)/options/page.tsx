"use client"

import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { OptionFormDialog } from "@/components/options/option-form-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { optionsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedLabel } from "@/lib/format"
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
  const del = useTranslations("deletion")
  const queryClient = useQueryClient()
  const locale = useLocale()
  const router = useRouter()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<OptionOut | undefined>()
  const [deleting, setDeleting] = useState<OptionOut | null>(null)

  async function handleDelete(option: OptionOut) {
    try {
      await optionsApi.delete(option.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.options.all })
      toast.success(t("deleted"))
    } catch (error) {
      // Colour and Size are built in, and an option a variant uses cannot go
      // either — the API says which, so its message is the useful one.
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

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
        <Badge variant="outline">
          {row.original.input_type === "swatch"
            ? t("inputTypes.swatch")
            : t("inputTypes.button")}
        </Badge>
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
            onDelete={() => setDeleting(row.original)}
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

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={del("confirmTitle", {
            name: translatedLabel(deleting.translations, locale),
          })}
          description={del("confirmDescription")}
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting)}
        />
      )}

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
