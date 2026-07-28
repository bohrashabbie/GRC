"use client"

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ConfirmDialog } from "@/components/confirm-dialog"
import { StatusBadge } from "@/components/status-badge"
import { StockBadge } from "@/components/stock-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { VariantMatrixBuilder } from "./variant-matrix-builder"
import { VariantPriceDialog } from "./variant-price-dialog"
import { usePermission } from "@/hooks/use-permission"
import { optionsApi, optionValuesApi, productsApi, variantsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { formatMoney, translatedLabel } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { OptionValueOut, VariantOut } from "@/lib/api/types"

export function ProductVariantsTab({
  productId,
  trackInventory,
}: {
  productId: number
  trackInventory: boolean
}) {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const canAdjustStock = usePermission(PERMISSIONS.stockAdjust)

  const [pricing, setPricing] = useState<VariantOut | null>(null)
  const [discontinuing, setDiscontinuing] = useState<VariantOut | null>(null)
  // Draft quantities, keyed by variant id. The inputs are controlled from here
  // rather than from the query data so typing does not fight a refetch, and so
  // the whole column can be saved as one transaction.
  const [draft, setDraft] = useState<Record<number, string>>({})
  const [savingStock, setSavingStock] = useState(false)

  const variantsQuery = useQuery({
    queryKey: queryKeys.products.variants(productId),
    queryFn: ({ signal }) => productsApi.listVariants(productId, signal),
  })

  // Option values are looked up so a variant's option_value_ids can be shown
  // as readable labels instead of raw IDs.
  const optionsQuery = useQuery({
    queryKey: queryKeys.options.list(),
    queryFn: ({ signal }) => optionsApi.list({ limit: 50 }, signal),
  })
  const options = optionsQuery.data?.items ?? []

  const valueQueries = useQueries({
    queries: options.map((option) => ({
      queryKey: queryKeys.options.values(option.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        optionValuesApi.list({ option_id: option.id, limit: 100 }, signal),
    })),
  })

  const valueLabelById = useMemo(() => {
    const map = new Map<number, string>()
    for (const query of valueQueries) {
      for (const value of query.data?.items ?? ([] as OptionValueOut[])) {
        map.set(value.id, translatedLabel(value.translations, locale))
      }
    }
    return map
  }, [valueQueries, locale])

  const variantsData = variantsQuery.data

  // Re-seed the draft whenever the server's numbers change, so a save (or
  // someone else's edit landing on a refetch) is reflected instead of leaving
  // stale text in the boxes.
  useEffect(() => {
    if (!variantsData) return
    setDraft(
      Object.fromEntries(variantsData.map((v) => [v.id, String(v.stock_quantity)]))
    )
  }, [variantsData])

  const dirtyStock = useMemo(() => {
    if (!variantsData) return []
    return variantsData.filter((variant) => {
      const value = draft[variant.id]
      return (
        value !== undefined &&
        value.trim() !== "" &&
        Number(value) !== variant.stock_quantity
      )
    })
  }, [variantsData, draft])

  const hasInvalidStock = Object.values(draft).some(
    (value) => value.trim() !== "" && !/^\d+$/.test(value.trim())
  )

  async function handleSaveStock() {
    if (dirtyStock.length === 0) return
    setSavingStock(true)
    try {
      await productsApi.setStock(productId, {
        items: dirtyStock.map((variant) => ({
          variant_id: variant.id,
          stock_quantity: Number(draft[variant.id]),
        })),
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.variants(productId),
        }),
        // The list page's stock column is derived from these numbers.
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
      ])
      toast.success(t("variants.stockSaved"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setSavingStock(false)
    }
  }

  async function handleDiscontinue(variant: VariantOut) {
    try {
      await variantsApi.discontinue(variant.id)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.products.variants(productId),
      })
      toast.success(t("variants.discontinued"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const variants = variantsQuery.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("variants.title")}</CardTitle>
          <CardDescription>{t("variants.description")}</CardDescription>
          {!trackInventory && (
            <p className="text-xs text-muted-foreground">
              {t("variants.trackingOffNotice")}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {variantsQuery.isLoading && <ListLoadingSkeleton rows={4} />}
          {variantsQuery.isError && (
            <ListErrorState
              error={variantsQuery.error}
              onRetry={() => variantsQuery.refetch()}
            />
          )}
          {variantsQuery.data && variants.length === 0 && (
            <ListEmptyState description={t("variants.empty")} />
          )}
          {variants.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("variants.columns.sku")}</TableHead>
                    <TableHead>{t("variants.columns.options")}</TableHead>
                    <TableHead>{t("variants.columns.price")}</TableHead>
                    <TableHead>{t("variants.columns.comparePrice")}</TableHead>
                    <TableHead className="w-40">
                      {t("variants.columns.stock")}
                    </TableHead>
                    <TableHead>{t("variants.columns.status")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">
                        <code className="text-xs">{variant.sku}</code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {variant.option_value_ids.length === 0
                          ? "—"
                          : variant.option_value_ids
                              .map((id) => valueLabelById.get(id) ?? `#${id}`)
                              .join(" · ")}
                      </TableCell>
                      <TableCell>{formatMoney(variant.price, locale)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatMoney(variant.compare_at_price, locale)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            dir="ltr"
                            inputMode="numeric"
                            className="h-8 w-20"
                            aria-label={t("variants.columns.stock")}
                            value={draft[variant.id] ?? ""}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                [variant.id]: event.target.value,
                              }))
                            }
                            disabled={!canAdjustStock || !variant.is_active}
                          />
                          <StockBadge
                            quantity={variant.stock_quantity}
                            threshold={variant.low_stock_threshold}
                            tracked={trackInventory}
                            outOfStockLabel={t("variants.outOfStock")}
                            lowStockLabel={t("variants.lowStock")}
                            untrackedLabel={t("variants.untracked")}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={variant.is_active ? "active" : "archived"}
                          label={variant.is_active ? c("active") : c("inactive")}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <RequirePermission
                            permission={PERMISSIONS.variantPriceEdit}
                          >
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setPricing(variant)}
                            >
                              {t("variants.editPrice")}
                            </Button>
                          </RequirePermission>
                          <RequirePermission permission={PERMISSIONS.catalogManage}>
                            {variant.is_active && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setDiscontinuing(variant)}
                              >
                                {t("variants.discontinue")}
                              </Button>
                            )}
                          </RequirePermission>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {variants.length > 0 && canAdjustStock && (
            <div className="mt-3 flex items-center justify-end gap-3">
              {hasInvalidStock && (
                <span className="text-xs text-destructive">
                  {t("variants.stockInvalid")}
                </span>
              )}
              <Button
                size="sm"
                onClick={handleSaveStock}
                disabled={
                  savingStock || hasInvalidStock || dirtyStock.length === 0
                }
              >
                {savingStock
                  ? c("saving")
                  : t("variants.saveStock", { count: dirtyStock.length })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RequirePermission permission={PERMISSIONS.catalogManage}>
        <Card>
          <CardContent className="pt-6">
            <VariantMatrixBuilder
              productId={productId}
              existingVariants={variants}
            />
          </CardContent>
        </Card>
      </RequirePermission>

      {pricing && (
        <VariantPriceDialog
          key={pricing.id}
          variant={pricing}
          productId={productId}
          open={!!pricing}
          onOpenChange={(open) => !open && setPricing(null)}
        />
      )}

      {discontinuing && (
        <ConfirmDialog
          open={!!discontinuing}
          onOpenChange={(open) => !open && setDiscontinuing(null)}
          title={t("variants.discontinueTitle")}
          description={t("variants.discontinueDescription", {
            sku: discontinuing.sku,
          })}
          confirmLabel={t("variants.discontinue")}
          onConfirm={() => handleDiscontinue(discontinuing)}
        />
      )}
    </div>
  )
}
