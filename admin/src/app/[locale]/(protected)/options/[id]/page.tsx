"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RowActions } from "@/components/row-actions"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { OptionValueFormDialog } from "@/components/options/option-value-form-dialog"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { optionsApi, optionValuesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { useDeletionMessage } from "@/lib/deletion"
import { translatedLabel } from "@/lib/format"
import { humanizeStatus } from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { OptionValueOut } from "@/lib/api/types"

export default function OptionDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.catalogView}>
      <OptionDetailContent />
    </RequireRoutePermission>
  )
}

/** Sizes are quoted in inches and stored in centimetres, so the list shows
 *  both rather than making staff convert in their heads. */
function measurement(cm: number | null): string {
  if (cm === null) return "—"
  return `${Math.round((cm / 2.54) * 10) / 10}" (${cm} cm)`
}

function OptionDetailContent() {
  const t = useTranslations("options")
  const c = useTranslations("common")
  const del = useTranslations("deletion")
  const locale = useLocale()
  const params = useParams<{ id: string }>()
  const optionId = Number(params.id)
  const queryClient = useQueryClient()
  const deletionMessage = useDeletionMessage()

  const [valueOpen, setValueOpen] = useState(false)
  const [editingValue, setEditingValue] = useState<OptionValueOut | undefined>()
  const [deletingValue, setDeletingValue] = useState<OptionValueOut | null>(null)

  async function handleDeleteValue(value: OptionValueOut) {
    const name = translatedLabel(value.translations, locale)
    try {
      const result = await optionValuesApi.delete(value.id)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.options.values(optionId),
      })
      toast.success(deletionMessage(result, name))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const optionQuery = useQuery({
    queryKey: queryKeys.options.detail(optionId),
    queryFn: ({ signal }) => optionsApi.get(optionId, signal),
    enabled: Number.isFinite(optionId),
  })

  const valuesQuery = useQuery({
    queryKey: queryKeys.options.values(optionId),
    queryFn: ({ signal }) =>
      optionValuesApi.list({ option_id: optionId, limit: 100 }, signal),
    enabled: Number.isFinite(optionId),
  })

  const optionLabel = optionQuery.data
    ? translatedLabel(optionQuery.data.translations, locale)
    : t("detailTitle")
  // Both live options take staff-added values. Anything else is a retired
  // pre-GR8 option row kept only because variants still point at it, and the
  // API rejects writes to it, so the buttons stay hidden there.
  const optionCode = optionQuery.data?.code
  const isSwatchOption = optionCode === "colour"
  const isSizeOption = optionCode === "size"
  const canManageValues = isSwatchOption || isSizeOption

  const values = [...(valuesQuery.data?.items ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  function openCreateValue() {
    setEditingValue(undefined)
    setValueOpen(true)
  }

  function openEditValue(value: OptionValueOut) {
    setEditingValue(value)
    setValueOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/options" },
          { label: optionLabel },
        ]}
      />

      {optionQuery.isLoading && <ListLoadingSkeleton rows={3} />}
      {optionQuery.isError && (
        <ListErrorState
          error={optionQuery.error}
          onRetry={() => optionQuery.refetch()}
        />
      )}

      {optionQuery.data && (
        <>
          <PageHeader
            title={optionLabel}
            description={t("systemDescription")}
          />

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <code className="text-xs">{optionQuery.data.code}</code>
            <Badge variant="outline">
              {humanizeStatus(optionQuery.data.input_type)}
            </Badge>
            {optionQuery.data.is_filterable && (
              <Badge variant="secondary">{t("fields.isFilterable")}</Badge>
            )}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>{t("values.title")}</CardTitle>
                <CardDescription>{t("values.description")}</CardDescription>
              </div>
              {canManageValues && (
                <RequirePermission permission={PERMISSIONS.catalogManage}>
                  <Button size="sm" onClick={openCreateValue}>
                    {isSwatchOption ? t("newColor") : t("newSize")}
                  </Button>
                </RequirePermission>
              )}
            </CardHeader>
            <CardContent>
              {valuesQuery.isLoading && <ListLoadingSkeleton rows={3} />}
              {valuesQuery.isError && (
                <ListErrorState
                  error={valuesQuery.error}
                  onRetry={() => valuesQuery.refetch()}
                />
              )}
              {valuesQuery.data && values.length === 0 && (
                <ListEmptyState description={t("values.empty")} />
              )}
              {values.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("values.columns.label")}</TableHead>
                        {isSwatchOption ? (
                          <TableHead>{t("values.columns.color")}</TableHead>
                        ) : (
                          <>
                            <TableHead>{t("values.lengthIn")}</TableHead>
                            <TableHead>{t("values.widthIn")}</TableHead>
                          </>
                        )}
                        <TableHead>{t("values.columns.sortOrder")}</TableHead>
                        <TableHead className="w-px">{c("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {values.map((value) => (
                        <TableRow key={value.id} className="even:bg-muted/30">
                          <TableCell className="font-medium text-foreground">
                            {translatedLabel(value.translations, locale)}
                          </TableCell>
                          {isSwatchOption ? (
                            <TableCell>
                              {value.hex_color ? (
                                <span className="flex items-center gap-2">
                                  <span
                                    aria-hidden
                                    className="size-5 shrink-0 rounded-md border border-border"
                                    style={{ backgroundColor: value.hex_color }}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {value.hex_color}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className="tabular-nums">
                                {measurement(value.length_cm)}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {measurement(value.width_cm)}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="tabular-nums">
                            {value.sort_order}
                          </TableCell>
                          <TableCell className="w-px whitespace-nowrap">
                            {canManageValues && (
                              <RequirePermission
                                permission={PERMISSIONS.catalogManage}
                              >
                                <RowActions
                                  onEdit={() => openEditValue(value)}
                                  onDelete={() => setDeletingValue(value)}
                                />
                              </RequirePermission>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {valueOpen && canManageValues && (
        <OptionValueFormDialog
          key={editingValue?.id ?? "new"}
          optionId={optionId}
          value={editingValue}
          withSwatch={isSwatchOption}
          withMeasurements={isSizeOption}
          open={valueOpen}
          onOpenChange={setValueOpen}
        />
      )}

      {deletingValue && (
        <ConfirmDialog
          open={!!deletingValue}
          onOpenChange={(open) => !open && setDeletingValue(null)}
          title={del("confirmTitle", {
            name: translatedLabel(deletingValue.translations, locale),
          })}
          description={del("confirmDescription")}
          confirmLabel={c("delete")}
          onConfirm={() => handleDeleteValue(deletingValue)}
        />
      )}
    </div>
  )
}
