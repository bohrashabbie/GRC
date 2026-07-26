"use client"

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import { toast } from "sonner"

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
import { ConfirmDialog } from "@/components/confirm-dialog"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { VariantMatrixBuilder } from "./variant-matrix-builder"
import { VariantPriceDialog } from "./variant-price-dialog"
import { optionsApi, optionValuesApi, productsApi, variantsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { formatMoney, translatedLabel } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { OptionValueOut, VariantOut } from "@/lib/api/types"

export function ProductVariantsTab({ productId }: { productId: number }) {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [pricing, setPricing] = useState<VariantOut | null>(null)
  const [discontinuing, setDiscontinuing] = useState<VariantOut | null>(null)

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
