"use client"

import { useQuery } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { locationsApi, transfersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { bilingualName } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { VariantOut } from "@/lib/api/types"

type DraftItem = { variant: VariantOut; qty: number }

export function TransferCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (transferId: number) => void
}) {
  const t = useTranslations("transfers")
  const c = useTranslations("common")
  const locale = useLocale()

  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [note, setNote] = useState("")
  const [items, setItems] = useState<DraftItem[]>([])
  const [pendingVariant, setPendingVariant] = useState<VariantOut | null>(null)
  const [pendingQty, setPendingQty] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list({ is_active: true }),
    queryFn: ({ signal }) => locationsApi.list({ is_active: true }, signal),
    enabled: open,
  })
  const locations = locationsQuery.data?.items ?? []

  const sameLocation = fromId !== "" && fromId === toId
  const canSubmit =
    fromId !== "" && toId !== "" && !sameLocation && items.length > 0

  function addItem() {
    if (!pendingVariant || pendingQty < 1) return
    setItems((prev) => {
      // Adding the same variant twice merges quantities instead of creating
      // two lines the backend would treat separately.
      const existing = prev.find((i) => i.variant.id === pendingVariant.id)
      if (existing) {
        return prev.map((i) =>
          i.variant.id === pendingVariant.id
            ? { ...i, qty: i.qty + pendingQty }
            : i
        )
      }
      return [...prev, { variant: pendingVariant, qty: pendingQty }]
    })
    setPendingVariant(null)
    setPendingQty(1)
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const transfer = await transfersApi.create({
        from_location_id: Number(fromId),
        to_location_id: Number(toId),
        note: note.trim() || null,
        items: items.map((i) => ({
          variant_id: i.variant.id,
          qty_requested: i.qty,
        })),
      })
      toast.success(t("created"))
      onOpenChange(false)
      onCreated(transfer.id)
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
              <Label>{t("fields.fromLocation")}</Label>
              <Select value={fromId} onValueChange={(v) => setFromId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {bilingualName(l, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("fields.toLocation")}</Label>
              <Select value={toId} onValueChange={(v) => setToId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {bilingualName(l, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sameLocation && (
            <Alert variant="destructive">
              <AlertDescription>{t("fields.sameLocation")}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-note">{t("fields.note")}</Label>
            <Input
              id="transfer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <h4 className="text-sm font-medium">{t("items.title")}</h4>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("items.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li
                    key={item.variant.id}
                    className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
                  >
                    <code className="flex-1 text-xs">{item.variant.sku}</code>
                    <span className="text-sm">
                      {t("items.qtyRequested")}: {item.qty}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={c("remove")}
                      onClick={() =>
                        setItems((prev) =>
                          prev.filter((i) => i.variant.id !== item.variant.id)
                        )
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
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transfer-qty">{t("items.qtyRequested")}</Label>
                <Input
                  id="transfer-qty"
                  type="number"
                  min={1}
                  dir="ltr"
                  className="w-28"
                  value={pendingQty}
                  onChange={(e) => setPendingQty(Number(e.target.value))}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!pendingVariant || pendingQty < 1}
                onClick={addItem}
              >
                {t("items.addItem")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {c("cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? c("creating") : c("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
