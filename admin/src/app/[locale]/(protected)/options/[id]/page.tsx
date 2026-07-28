"use client"

import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { OptionValueFormDialog } from "@/components/options/option-value-form-dialog"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { optionsApi, optionValuesApi } from "@/lib/api/endpoints"
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

function OptionDetailContent() {
  const t = useTranslations("options")
  const c = useTranslations("common")
  const locale = useLocale()
  const params = useParams<{ id: string }>()
  const optionId = Number(params.id)

  const [valueOpen, setValueOpen] = useState(false)
  const [editingValue, setEditingValue] = useState<OptionValueOut | undefined>()

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
  const canManageValues = optionQuery.data?.code === "colour"

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
                    {t("newColor")}
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
                <ul className="flex flex-col gap-2">
                  {values.map((value) => (
                    <li
                      key={value.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                    >
                      {value.hex_color && (
                        <span
                          aria-hidden
                          className="size-6 shrink-0 rounded-md border border-border"
                          style={{ backgroundColor: value.hex_color }}
                        />
                      )}
                      <span className="flex-1 text-sm font-medium text-foreground">
                        {translatedLabel(value.translations, locale)}
                      </span>
                      <code className="text-xs text-muted-foreground">
                        {value.code}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        #{value.sort_order}
                      </span>
                      {canManageValues && (
                        <RequirePermission permission={PERMISSIONS.catalogManage}>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => openEditValue(value)}
                          >
                            {c("edit")}
                          </Button>
                        </RequirePermission>
                      )}
                    </li>
                  ))}
                </ul>
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
          open={valueOpen}
          onOpenChange={setValueOpen}
        />
      )}
    </div>
  )
}
