"use client"

import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import {
  goodsReceiptsApi,
  locationsApi,
  purchaseOrdersApi,
} from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { bilingualName, formatMoney } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { useRouter } from "@/i18n/navigation"

export default function ReceivePage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.goodsReceiptCreate}>
      <ReceiveContent />
    </RequireRoutePermission>
  )
}

function ReceiveContent() {
  const t = useTranslations("purchaseOrders")
  const c = useTranslations("common")
  const locale = useLocale()
  const params = useParams<{ id: string }>()
  const poId = Number(params.id)
  const router = useRouter()

  const [locationId, setLocationId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [note, setNote] = useState("")
  const [qty, setQty] = useState<Record<number, string>>({})
  const [rejected, setRejected] = useState<Record<number, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const poQuery = useQuery({
    queryKey: queryKeys.purchaseOrders.detail(poId),
    queryFn: ({ signal }) => purchaseOrdersApi.get(poId, signal),
    enabled: Number.isFinite(poId),
  })
  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list({ is_active: true }),
    queryFn: ({ signal }) => locationsApi.list({ is_active: true }, signal),
  })

  const po = poQuery.data

  // Default the receiving location and quantities to the outstanding amounts,
  // which is the common case — partial receipts are just edits from there.
  useEffect(() => {
    if (!po) return
    setLocationId(String(po.destination_location_id))
    setQty(
      Object.fromEntries(
        po.items.map((item) => [
          item.id,
          String(Math.max(item.qty_ordered - item.qty_received, 0)),
        ])
      )
    )
  }, [po])

  const outstanding = (itemId: number) => {
    const item = po?.items.find((i) => i.id === itemId)
    if (!item) return 0
    return Math.max(item.qty_ordered - item.qty_received, 0)
  }

  const lines = (po?.items ?? [])
    .map((item) => ({
      item,
      qty: Number(qty[item.id] ?? 0),
      qtyRejected: Number(rejected[item.id] ?? 0),
    }))
    .filter((line) => line.qty > 0 || line.qtyRejected > 0)

  async function handleSubmit() {
    if (!po || lines.length === 0 || locationId === "") return
    setIsSubmitting(true)
    try {
      const receipt = await goodsReceiptsApi.create({
        purchase_order_id: po.id,
        location_id: Number(locationId),
        supplier_invoice_number: invoiceNumber || null,
        note: note || null,
        items: lines.map((line) => ({
          purchase_order_item_id: line.item.id,
          variant_id: line.item.variant_id,
          qty: line.qty,
          qty_rejected: line.qtyRejected,
          unit_cost: line.item.unit_cost,
        })),
      })
      toast.success(t("receiptNumber", { number: receipt.receipt_number }))
      router.push(`/purchase-orders/${po.id}`)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/purchase-orders" },
          {
            label: po?.po_number ?? t("detailTitle"),
            href: `/purchase-orders/${poId}`,
          },
          { label: t("receiveTitle") },
        ]}
      />

      {poQuery.isLoading && <ListLoadingSkeleton rows={5} />}
      {poQuery.isError && (
        <ListErrorState error={poQuery.error} onRetry={() => poQuery.refetch()} />
      )}

      {po && (
        <>
          <PageHeader
            title={t("receiveTitle")}
            description={t("receiveDescription")}
          />

          <Card>
            <CardHeader>
              <CardTitle>{po.po_number}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label>{t("receiveFields.location")}</Label>
                  <Select
                    value={locationId}
                    onValueChange={(v) => setLocationId(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(locationsQuery.data?.items ?? []).map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {bilingualName(l, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gr-invoice">
                    {t("receiveFields.invoiceNumber")}
                  </Label>
                  <Input
                    id="gr-invoice"
                    dir="ltr"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gr-note">{t("receiveFields.note")}</Label>
                  <Input
                    id="gr-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("items.variant")}</TableHead>
                      <TableHead>{t("items.qtyOrdered")}</TableHead>
                      <TableHead>{t("receiveFields.outstanding")}</TableHead>
                      <TableHead>{t("receiveFields.qty")}</TableHead>
                      <TableHead>{t("receiveFields.qtyRejected")}</TableHead>
                      <TableHead>{t("items.unitCost")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <code className="text-xs">#{item.variant_id}</code>
                        </TableCell>
                        <TableCell>{item.qty_ordered}</TableCell>
                        <TableCell className="font-medium">
                          {outstanding(item.id)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            dir="ltr"
                            className="w-24"
                            value={qty[item.id] ?? ""}
                            onChange={(e) =>
                              setQty((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            dir="ltr"
                            className="w-24"
                            value={rejected[item.id] ?? ""}
                            onChange={(e) =>
                              setRejected((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatMoney(item.unit_cost, locale, po.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/purchase-orders/${po.id}`)}
                >
                  {c("cancel")}
                </Button>
                <Button
                  disabled={lines.length === 0 || locationId === "" || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? c("saving") : t("receive")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
