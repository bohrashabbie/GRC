"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { locationsApi, purchaseOrdersApi, suppliersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { bilingualName, formatMoney } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { Link } from "@/i18n/navigation"

type PendingAction = "approve" | "send" | "cancel" | null

export default function PurchaseOrderDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.purchaseOrderManage}>
      <PurchaseOrderDetailContent />
    </RequireRoutePermission>
  )
}

function PurchaseOrderDetailContent() {
  const t = useTranslations("purchaseOrders")
  const c = useTranslations("common")
  const locale = useLocale()
  const format = useFormatter()
  const params = useParams<{ id: string }>()
  const poId = Number(params.id)
  const queryClient = useQueryClient()

  const [pending, setPending] = useState<PendingAction>(null)

  const poQuery = useQuery({
    queryKey: queryKeys.purchaseOrders.detail(poId),
    queryFn: ({ signal }) => purchaseOrdersApi.get(poId, signal),
    enabled: Number.isFinite(poId),
  })

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers.list({}),
    queryFn: ({ signal }) => suppliersApi.list({ limit: 100 }, signal),
  })
  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list({}),
    queryFn: ({ signal }) => locationsApi.list({}, signal),
  })

  const po = poQuery.data
  const supplierName =
    suppliersQuery.data?.items.find((s) => s.id === po?.supplier_id)?.name ??
    (po ? `#${po.supplier_id}` : "")
  const destination = locationsQuery.data?.items.find(
    (l) => l.id === po?.destination_location_id
  )

  async function runAction(action: Exclude<PendingAction, null>) {
    try {
      if (action === "approve") await purchaseOrdersApi.approve(poId)
      if (action === "send") await purchaseOrdersApi.send(poId)
      if (action === "cancel") await purchaseOrdersApi.cancel(poId)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(poId),
      })
      toast.success(
        action === "approve"
          ? t("approved")
          : action === "send"
            ? t("sent")
            : t("cancelled")
      )
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const isTerminal = po?.status === "cancelled" || po?.status === "received"

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/purchase-orders" },
          { label: po?.po_number ?? t("detailTitle") },
        ]}
      />

      {poQuery.isLoading && <ListLoadingSkeleton rows={5} />}
      {poQuery.isError && (
        <ListErrorState error={poQuery.error} onRetry={() => poQuery.refetch()} />
      )}

      {po && (
        <>
          <PageHeader
            title={po.po_number}
            description={`${supplierName} → ${destination ? bilingualName(destination, locale) : `#${po.destination_location_id}`}`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={po.status} />
                <RequirePermission permission={PERMISSIONS.purchaseOrderManage}>
                  {po.status === "draft" && (
                    <Button onClick={() => setPending("approve")}>
                      {t("approve")}
                    </Button>
                  )}
                  {po.status === "approved" && (
                    <Button onClick={() => setPending("send")}>
                      {t("send")}
                    </Button>
                  )}
                  {!isTerminal && (
                    <Button
                      variant="outline"
                      onClick={() => setPending("cancel")}
                    >
                      {t("cancel")}
                    </Button>
                  )}
                </RequirePermission>
                <RequirePermission permission={PERMISSIONS.goodsReceiptCreate}>
                  {!isTerminal && (
                    <Button
                      variant="outline"
                      render={
                        <Link href={`/purchase-orders/${po.id}/receive`}>
                          {t("receive")}
                        </Link>
                      }
                    />
                  )}
                </RequirePermission>
              </div>
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>{t("items.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("items.variant")}</TableHead>
                      <TableHead>{t("items.qtyOrdered")}</TableHead>
                      <TableHead>{t("items.qtyReceived")}</TableHead>
                      <TableHead>{t("items.unitCost")}</TableHead>
                      <TableHead>{t("items.lineTotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <code className="text-xs">#{item.variant_id}</code>
                        </TableCell>
                        <TableCell>{item.qty_ordered}</TableCell>
                        <TableCell>{item.qty_received}</TableCell>
                        <TableCell>
                          {formatMoney(item.unit_cost, locale, po.currency)}
                        </TableCell>
                        <TableCell>
                          {formatMoney(item.line_total, locale, po.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <dl className="ms-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t("totals.subtotal")}
                  </dt>
                  <dd>{formatMoney(po.subtotal, locale, po.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("totals.tax")}</dt>
                  <dd>{formatMoney(po.tax_total, locale, po.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t("totals.shipping")}
                  </dt>
                  <dd>{formatMoney(po.shipping_cost, locale, po.currency)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                  <dt>{t("totals.total")}</dt>
                  <dd>{formatMoney(po.total, locale, po.currency)}</dd>
                </div>
              </dl>

              {po.expected_at && (
                <p className="text-sm text-muted-foreground">
                  {t("fields.expectedAt")}:{" "}
                  {format.dateTime(new Date(po.expected_at), "short")}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {pending && po && (
        <ConfirmDialog
          open={pending !== null}
          onOpenChange={(open) => !open && setPending(null)}
          destructive={pending === "cancel"}
          title={
            pending === "approve"
              ? t("approveTitle")
              : pending === "send"
                ? t("sendTitle")
                : t("cancelTitle")
          }
          description={
            pending === "approve"
              ? t("approveDescription", { po: po.po_number })
              : pending === "send"
                ? t("sendDescription", { po: po.po_number })
                : t("cancelDescription", { po: po.po_number })
          }
          onConfirm={() => runAction(pending)}
        />
      )}
    </div>
  )
}
