"use client"

import { useQuery } from "@tanstack/react-query"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { OrderNotesCard } from "@/components/orders/order-notes-card"
import { OrderRefundDialog } from "@/components/orders/order-refund-dialog"
import { OrderStatusCard } from "@/components/orders/order-status-card"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import { ordersApi } from "@/lib/api/endpoints"
import { formatMoney, formatTaxRate } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { PaymentOut } from "@/lib/api/types"

export default function OrderDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.orderView}>
      <OrderDetailContent />
    </RequireRoutePermission>
  )
}

function OrderDetailContent() {
  const t = useTranslations("orders")
  const locale = useLocale()
  const format = useFormatter()
  const params = useParams<{ id: string }>()
  const orderId = Number(params.id)

  const [refunding, setRefunding] = useState<PaymentOut | null>(null)

  const orderQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    enabled: Number.isFinite(orderId),
  })

  const order = orderQuery.data

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/orders" },
          { label: order?.order_number ?? t("detailTitle") },
        ]}
      />

      {orderQuery.isLoading && <ListLoadingSkeleton rows={6} />}
      {orderQuery.isError && (
        <ListErrorState
          error={orderQuery.error}
          onRetry={() => orderQuery.refetch()}
        />
      )}

      {order && (
        <>
          <PageHeader
            title={order.order_number}
            description={`${order.email ?? order.phone_e164 ?? ""} · ${format.dateTime(new Date(order.placed_at), "long")}`}
            action={
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <StatusBadge status={order.payment_status} />
              </div>
            }
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("items.title")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("items.sku")}</TableHead>
                          <TableHead>{t("items.name")}</TableHead>
                          <TableHead>{t("items.unitPrice")}</TableHead>
                          <TableHead>{t("items.qty")}</TableHead>
                          <TableHead>{t("items.lineTotal")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <code className="text-xs">{item.sku_snapshot}</code>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{item.name_snapshot}</span>
                                <span className="text-xs text-muted-foreground">
                                  {t("items.fulfilled")}: {item.qty_fulfilled} ·{" "}
                                  {t("items.returned")}: {item.qty_returned} ·{" "}
                                  {formatTaxRate(item.tax_rate_snapshot, locale)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatMoney(
                                item.unit_price_snapshot,
                                locale,
                                order.currency
                              )}
                            </TableCell>
                            <TableCell>{item.qty}</TableCell>
                            <TableCell className="font-medium">
                              {formatMoney(item.line_total, locale, order.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("items.snapshotHint")}
                  </p>

                  <dl className="ms-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {t("summary.subtotal")}
                      </dt>
                      <dd>{formatMoney(order.subtotal, locale, order.currency)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {t("summary.discount")}
                      </dt>
                      <dd>
                        {formatMoney(order.discount_total, locale, order.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {t("summary.shipping")}
                      </dt>
                      <dd>
                        {formatMoney(order.shipping_total, locale, order.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("summary.tax")}</dt>
                      <dd>{formatMoney(order.tax_total, locale, order.currency)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                      <dt>{t("summary.total")}</dt>
                      <dd>
                        {formatMoney(order.grand_total, locale, order.currency)}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("payments.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {order.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("payments.empty")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("payments.provider")}</TableHead>
                            <TableHead>{t("payments.amount")}</TableHead>
                            <TableHead>{t("payments.refunded")}</TableHead>
                            <TableHead>{t("payments.status")}</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.payments.map((payment) => {
                            const remaining =
                              Number(payment.amount) - Number(payment.refunded_amount)
                            return (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>{payment.provider}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {payment.method ?? ""}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatMoney(payment.amount, locale, payment.currency)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatMoney(
                                    payment.refunded_amount,
                                    locale,
                                    payment.currency
                                  )}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={payment.status} />
                                </TableCell>
                                <TableCell>
                                  <RequirePermission
                                    permission={PERMISSIONS.orderRefund}
                                  >
                                    {payment.status === "captured" &&
                                      remaining > 0 && (
                                        <Button
                                          variant="outline"
                                          size="xs"
                                          onClick={() => setRefunding(payment)}
                                        >
                                          {t("refund.action")}
                                        </Button>
                                      )}
                                  </RequirePermission>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <OrderNotesCard orderId={order.id} notes={order.notes} />
            </div>

            <div className="flex flex-col gap-4">
              <OrderStatusCard order={order} />

              <Card>
                <CardHeader>
                  <CardTitle>{t("addresses.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {order.addresses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("addresses.empty")}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {order.addresses.map((address, index) => (
                        <li key={`${address.type}-${index}`} className="text-sm">
                          <p className="font-medium">
                            {address.type === "billing"
                              ? t("addresses.billing")
                              : t("addresses.shipping")}
                          </p>
                          <p className="text-muted-foreground">
                            {address.recipient_name}
                            <br />
                            {address.line1}
                            {address.line2 ? `, ${address.line2}` : ""}
                            <br />
                            {address.district ? `${address.district}, ` : ""}
                            {address.city}, {address.region_name}
                            <br />
                            {address.postal_code} {address.country_code}
                            <br />
                            {address.phone_e164}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {refunding && order && (
        <OrderRefundDialog
          key={refunding.id}
          orderId={order.id}
          payment={refunding}
          currency={order.currency}
          open={!!refunding}
          onOpenChange={(open) => !open && setRefunding(null)}
        />
      )}
    </div>
  )
}
