"use client"

import { useQuery } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VariantPicker } from "@/components/variant-picker"
import {
  locationsApi,
  purchaseOrdersApi,
  suppliersApi,
} from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { bilingualName, formatMoney } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { VariantOut } from "@/lib/api/types"

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/

type DraftLine = { variant: VariantOut; qty: number; unitCost: string }

export function PoCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (poId: number) => void
}) {
  const t = useTranslations("purchaseOrders")
  const c = useTranslations("common")
  const locale = useLocale()

  const [supplierId, setSupplierId] = useState("")
  const [destinationId, setDestinationId] = useState("")
  const [expectedAt, setExpectedAt] = useState("")
  const [taxTotal, setTaxTotal] = useState("0")
  const [shippingCost, setShippingCost] = useState("0")
  const [lines, setLines] = useState<DraftLine[]>([])
  const [pendingVariant, setPendingVariant] = useState<VariantOut | null>(null)
  const [pendingQty, setPendingQty] = useState(1)
  const [pendingCost, setPendingCost] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers.list({ is_active: true }),
    queryFn: ({ signal }) => suppliersApi.list({ is_active: true, limit: 100 }, signal),
    enabled: open,
  })
  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list({ is_active: true }),
    queryFn: ({ signal }) => locationsApi.list({ is_active: true }, signal),
    enabled: open,
  })

  const canAddLine =
    pendingVariant !== null && pendingQty > 0 && MONEY_PATTERN.test(pendingCost)
  const canSubmit =
    supplierId !== "" && destinationId !== "" && lines.length > 0

  // Display-only running subtotal. The backend computes the authoritative
  // totals — this is never sent back as a price.
  const subtotalPreview = lines
    .reduce((sum, line) => sum + Number(line.unitCost) * line.qty, 0)
    .toFixed(2)

  function addLine() {
    if (!canAddLine || !pendingVariant) return
    setLines((prev) => [
      ...prev,
      { variant: pendingVariant, qty: pendingQty, unitCost: pendingCost },
    ])
    setPendingVariant(null)
    setPendingQty(1)
    setPendingCost("")
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const po = await purchaseOrdersApi.create({
        supplier_id: Number(supplierId),
        destination_location_id: Number(destinationId),
        expected_at: expectedAt || null,
        tax_total: taxTotal || "0",
        shipping_cost: shippingCost || "0",
        items: lines.map((line) => ({
          variant_id: line.variant.id,
          qty_ordered: line.qty,
          unit_cost: line.unitCost,
        })),
      })
      toast.success(t("created"))
      onOpenChange(false)
      onCreated(po.id)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("fields.supplier")}</Label>
              <Select
                value={supplierId}
                onValueChange={(v) => setSupplierId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(suppliersQuery.data?.items ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("fields.destination")}</Label>
              <Select
                value={destinationId}
                onValueChange={(v) => setDestinationId(v ?? "")}
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
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="po-expected">{t("fields.expectedAt")}</Label>
              <Input
                id="po-expected"
                type="date"
                dir="ltr"
                value={expectedAt}
                onChange={(e) => setExpectedAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="po-tax">{t("fields.taxTotal")}</Label>
              <Input
                id="po-tax"
                dir="ltr"
                inputMode="decimal"
                value={taxTotal}
                onChange={(e) => setTaxTotal(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="po-shipping">{t("fields.shippingCost")}</Label>
              <Input
                id="po-shipping"
                dir="ltr"
                inputMode="decimal"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t("items.title")}</h4>
              {lines.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("totals.subtotal")}: {formatMoney(subtotalPreview, locale)}
                </span>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("items.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lines.map((line, index) => (
                  <li
                    key={`${line.variant.id}-${index}`}
                    className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
                  >
                    <code className="flex-1 text-xs">{line.variant.sku}</code>
                    <span className="text-sm">×{line.qty}</span>
                    <span className="text-sm">
                      {formatMoney(line.unitCost, locale)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={c("remove")}
                      onClick={() =>
                        setLines((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <VariantPicker
              value={pendingVariant?.id ?? null}
              onChange={setPendingVariant}
            />
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="po-qty">{t("items.qtyOrdered")}</Label>
                <Input
                  id="po-qty"
                  type="number"
                  min={1}
                  dir="ltr"
                  className="w-24"
                  value={pendingQty}
                  onChange={(e) => setPendingQty(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="po-cost">{t("items.unitCost")}</Label>
                <Input
                  id="po-cost"
                  dir="ltr"
                  inputMode="decimal"
                  className="w-32"
                  placeholder="120.00"
                  value={pendingCost}
                  onChange={(e) => setPendingCost(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!canAddLine}
                onClick={addLine}
              >
                {t("items.addItem")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {c("cancel")}
          </Button>
          <Button disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? c("creating") : c("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
