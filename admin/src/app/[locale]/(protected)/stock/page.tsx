"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { useState } from "react"

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
import { PageHeader } from "@/components/page-header"
import { VariantPicker } from "@/components/variant-picker"
import { StockAdjustDialog } from "@/components/stock/stock-adjust-dialog"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { locationsApi, stockApi } from "@/lib/api/endpoints"
import { bilingualName } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { VariantOut } from "@/lib/api/types"

export default function StockPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.inventoryView}>
      <StockContent />
    </RequireRoutePermission>
  )
}

function StockContent() {
  const t = useTranslations("stock")
  const locale = useLocale()
  const format = useFormatter()
  const queryClient = useQueryClient()

  const [variant, setVariant] = useState<VariantOut | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)

  const levelsQuery = useQuery({
    queryKey: queryKeys.stock.levels(variant?.id ?? 0),
    queryFn: ({ signal }) => stockApi.levels(variant!.id, signal),
    enabled: variant !== null,
  })

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list({ is_active: true }),
    queryFn: ({ signal }) => locationsApi.list({ is_active: true }, signal),
  })
  const locations = locationsQuery.data?.items ?? []

  const locationName = (id: number) => {
    const location = locations.find((l) => l.id === id)
    return location ? bilingualName(location, locale) : `#${id}`
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          variant && (
            <RequirePermission permission={PERMISSIONS.stockAdjust}>
              <Button onClick={() => setAdjustOpen(true)}>
                {t("adjust.open")}
              </Button>
            </RequirePermission>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("pickVariant")}</CardTitle>
          <CardDescription>{t("noSearchHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <VariantPicker value={variant?.id ?? null} onChange={setVariant} />
        </CardContent>
      </Card>

      {variant && (
        <Card>
          <CardHeader>
            <CardTitle>
              <code className="text-sm">{variant.sku}</code>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {levelsQuery.isLoading && <ListLoadingSkeleton rows={3} />}
            {levelsQuery.isError && (
              <ListErrorState
                error={levelsQuery.error}
                onRetry={() => levelsQuery.refetch()}
              />
            )}
            {levelsQuery.data && levelsQuery.data.length === 0 && (
              <ListEmptyState description={t("empty")} />
            )}
            {levelsQuery.data && levelsQuery.data.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("columns.location")}</TableHead>
                      <TableHead>{t("columns.onHand")}</TableHead>
                      <TableHead>{t("columns.reserved")}</TableHead>
                      <TableHead>{t("columns.incoming")}</TableHead>
                      <TableHead>{t("columns.available")}</TableHead>
                      <TableHead>{t("columns.updated")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levelsQuery.data.map((level) => (
                      <TableRow key={`${level.variant_id}-${level.location_id}`}>
                        <TableCell className="font-medium">
                          {locationName(level.location_id)}
                        </TableCell>
                        <TableCell>{level.on_hand}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {level.reserved}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {level.incoming}
                        </TableCell>
                        <TableCell className="font-medium">
                          {level.available}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format.dateTime(new Date(level.updated_at), "short")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {adjustOpen && variant && (
        <StockAdjustDialog
          variant={variant}
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          onAdjusted={() =>
            queryClient.invalidateQueries({
              queryKey: queryKeys.stock.levels(variant.id),
            })
          }
        />
      )}
    </div>
  )
}
