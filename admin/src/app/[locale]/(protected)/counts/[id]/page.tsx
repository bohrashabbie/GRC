"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import { countsApi, locationsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { bilingualName } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"

export default function CountDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.stockCount}>
      <CountDetailContent />
    </RequireRoutePermission>
  )
}

function CountDetailContent() {
  const t = useTranslations("counts")
  const c = useTranslations("common")
  const locale = useLocale()
  const params = useParams<{ id: string }>()
  const countId = Number(params.id)
  const queryClient = useQueryClient()

  const [counted, setCounted] = useState<Record<number, string>>({})
  const [applyOpen, setApplyOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const countQuery = useQuery({
    queryKey: queryKeys.counts.detail(countId),
    queryFn: ({ signal }) => countsApi.get(countId, signal),
    enabled: Number.isFinite(countId),
  })

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list({}),
    queryFn: ({ signal }) => locationsApi.list({}, signal),
  })

  const count = countQuery.data
  const isApplied = count?.applied_at !== null && count?.applied_at !== undefined

  // Seed the inputs from whatever's already been recorded server-side.
  useEffect(() => {
    if (!count) return
    setCounted(
      Object.fromEntries(
        count.items.map((item) => [
          item.id,
          item.counted_qty === null ? "" : String(item.counted_qty),
        ])
      )
    )
  }, [count])

  const locationName = (id: number) => {
    const location = locationsQuery.data?.items.find((l) => l.id === id)
    return location ? bilingualName(location, locale) : `#${id}`
  }

  async function handleRecord() {
    if (!count) return
    const items = count.items
      .filter((item) => counted[item.id] !== "" && counted[item.id] !== undefined)
      .map((item) => ({
        item_id: item.id,
        counted_qty: Number(counted[item.id]),
      }))
    if (items.length === 0) return

    setIsSaving(true)
    try {
      await countsApi.record(countId, { items })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.counts.detail(countId),
      })
      toast.success(t("recorded"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleApply() {
    try {
      await countsApi.apply(countId)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.counts.detail(countId),
      })
      toast.success(t("applied"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  /** Live variance preview from what's typed, before it's saved. */
  function previewVariance(systemQty: number, itemId: number): number | null {
    const raw = counted[itemId]
    if (raw === "" || raw === undefined) return null
    const value = Number(raw)
    if (Number.isNaN(value)) return null
    return value - systemQty
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/counts" },
          { label: count?.count_number ?? t("detailTitle") },
        ]}
      />

      {countQuery.isLoading && <ListLoadingSkeleton rows={5} />}
      {countQuery.isError && (
        <ListErrorState
          error={countQuery.error}
          onRetry={() => countQuery.refetch()}
        />
      )}

      {count && (
        <>
          <PageHeader
            title={count.count_number}
            description={locationName(count.location_id)}
            action={
              <div className="flex items-center gap-2">
                <StatusBadge status={count.status} />
                {!isApplied && (
                  <RequirePermission permission={PERMISSIONS.stockCount}>
                    <Button
                      variant="outline"
                      disabled={isSaving}
                      onClick={handleRecord}
                    >
                      {isSaving ? c("saving") : t("record")}
                    </Button>
                    <Button onClick={() => setApplyOpen(true)}>
                      {t("applyAction")}
                    </Button>
                  </RequirePermission>
                )}
              </div>
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>{t("items.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("fields.variants")}</TableHead>
                      <TableHead>{t("items.systemQty")}</TableHead>
                      <TableHead>{t("items.countedQty")}</TableHead>
                      <TableHead>{t("items.variance")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {count.items.map((item) => {
                      const variance =
                        item.variance ??
                        previewVariance(item.system_qty, item.id)
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <code className="text-xs">#{item.variant_id}</code>
                          </TableCell>
                          <TableCell>{item.system_qty}</TableCell>
                          <TableCell>
                            {isApplied ? (
                              (item.counted_qty ?? "—")
                            ) : (
                              <Input
                                type="number"
                                dir="ltr"
                                className="w-24"
                                value={counted[item.id] ?? ""}
                                onChange={(e) =>
                                  setCounted((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "font-medium",
                              variance === null
                                ? "text-muted-foreground"
                                : variance > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : variance < 0
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                            )}
                          >
                            {variance === null
                              ? "—"
                              : variance > 0
                                ? `+${variance}`
                                : variance}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        title={t("applyTitle")}
        description={t("applyDescription")}
        confirmLabel={t("applyAction")}
        onConfirm={handleApply}
      />
    </div>
  )
}
