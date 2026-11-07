"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RequirePermission } from "@/components/permission/require-permission"
import { shippingApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import type { PorterPreview } from "@/lib/api/types"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"

/**
 * Porter Express for one order: send it, then show its tracking number, label
 * and delivery status. Sending is a real courier booking, so it is always a
 * person's decision, made in a form that shows what will be booked.
 */
export function PorterShipmentCard({ orderId, isPaid }: { orderId: number; isPaid: boolean }) {
  const t = useTranslations("orders.porter")
  const c = useTranslations("common")
  const format = useFormatter()
  const queryClient = useQueryClient()
  const [isSending, setIsSending] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.porter(orderId),
    queryFn: ({ signal }) => shippingApi.preview(orderId, signal),
  })

  async function refresh() {
    setIsRefreshing(true)
    try {
      await shippingApi.refresh(orderId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.porter(orderId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
    } catch (err) {
      toast.error(getErrorMessage(err, c("unknownError")))
    } finally {
      setIsRefreshing(false)
    }
  }

  async function printLabel() {
    // Opened before the request so the browser treats it as the click's own window.
    const win = window.open("", "_blank")
    try {
      const { html } = await shippingApi.label(orderId)
      win?.document.open()
      win?.document.write(html)
      win?.document.close()
      win?.setTimeout(() => win.print(), 400)
    } catch (err) {
      win?.close()
      toast.error(getErrorMessage(err, c("unknownError")))
    }
  }

  const shipment = data?.shipment ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {isLoading ? (
          <p className="text-muted-foreground">{c("loading")}</p>
        ) : error ? (
          <p className="text-destructive">{getErrorMessage(error, c("unknownError"))}</p>
        ) : !data?.enabled ? (
          <p className="text-muted-foreground">{t("disabled")}</p>
        ) : shipment && shipment.status !== "cancelled" ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("tracking")}</span>
              <span className="font-mono font-medium" dir="ltr">
                {shipment.tracking_number}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("status")}</span>
              <Badge variant={shipment.status === "delivered" ? "default" : "secondary"}>
                {t(`statuses.${shipment.status}`)}
              </Badge>
            </div>
            {shipment.shipped_at && (
              <p className="text-xs text-muted-foreground">
                {t("sentOn", { date: format.dateTime(new Date(shipment.shipped_at), { dateStyle: "medium", timeStyle: "short" }) })}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <RequirePermission permission={PERMISSIONS.shipmentManage}>
                <Button size="sm" variant="outline" onClick={printLabel}>
                  {t("printLabel")}
                </Button>
              </RequirePermission>
              <Button size="sm" variant="ghost" onClick={refresh} disabled={isRefreshing}>
                {isRefreshing ? c("loading") : t("refresh")}
              </Button>
            </div>
          </>
        ) : data.is_kuwait === false ? (
          <p className="text-muted-foreground">{t("outsideKuwait")}</p>
        ) : !isPaid ? (
          <p className="text-muted-foreground">{t("notPaid")}</p>
        ) : (
          <>
            <p className="text-muted-foreground">{t("notSent")}</p>
            <RequirePermission permission={PERMISSIONS.shipmentManage}>
              <Button size="sm" onClick={() => setIsSending(true)}>
                {t("send")}
              </Button>
            </RequirePermission>
          </>
        )}
      </CardContent>

      {data && isSending && (
        <SendDialog
          orderId={orderId}
          preview={data}
          onClose={() => setIsSending(false)}
          onSent={async () => {
            setIsSending(false)
            await queryClient.invalidateQueries({ queryKey: queryKeys.orders.porter(orderId) })
          }}
        />
      )}
    </Card>
  )
}

function SendDialog({
  orderId,
  preview,
  onClose,
  onSent,
}: {
  orderId: number
  preview: PorterPreview
  onClose: () => void
  onSent: () => Promise<void>
}) {
  const t = useTranslations("orders.porter")
  const c = useTranslations("common")
  const [service, setService] = useState(preview.default_service ?? "DS")
  const [areaId, setAreaId] = useState(preview.suggested_area_id ?? "")
  const [weight, setWeight] = useState(preview.default_weight ?? "1.000")
  const [pieces, setPieces] = useState(String(preview.default_pieces ?? 1))
  const [description, setDescription] = useState(preview.default_description ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function submit() {
    if (!areaId) {
      setProblem(t("chooseArea"))
      return
    }
    setIsSubmitting(true)
    setProblem(null)
    try {
      const shipment = await shippingApi.send(orderId, {
        service_code: service,
        area_id: areaId,
        weight,
        pieces: Number(pieces),
        description: description.trim(),
      })
      toast.success(t("sent", { tracking: shipment.tracking_number ?? "" }))
      await onSent()
    } catch (err) {
      setProblem(getErrorMessage(err, c("unknownError")))
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("sendTitle")}</DialogTitle>
          <DialogDescription>{t("sendDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="porter-service">{t("service")}</Label>
            <select id="porter-service" className={selectClass} value={service} onChange={(e) => setService(e.target.value)}>
              {preview.services?.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="porter-area">{t("area")}</Label>
            <select id="porter-area" className={selectClass} value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">{t("chooseArea")}</option>
              {preview.areas?.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {preview.suggested_area_id ? t("areaMatched") : t("areaNotMatched")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="porter-weight">{t("weight")}</Label>
              <Input id="porter-weight" dir="ltr" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="porter-pieces">{t("pieces")}</Label>
              <Input id="porter-pieces" dir="ltr" inputMode="numeric" value={pieces} onChange={(e) => setPieces(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="porter-description">{t("description")}</Label>
            <Input id="porter-description" maxLength={100} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {problem && (
            <Alert variant="destructive">
              <AlertDescription>{problem}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {c("cancel")}
          </Button>
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? c("loading") : t("confirmSend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
