"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
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
import { Switch } from "@/components/ui/switch"
import { couponsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type { CouponDiscountType, CouponOut } from "@/lib/api/types"

const DISCOUNT_TYPES = ["percent", "fixed"] as const

/** `datetime-local` wants "YYYY-MM-DDTHH:mm"; the API sends ISO with a zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function CouponFormDialog({
  coupon,
  open,
  onOpenChange,
}: {
  /** Undefined = create mode. */
  coupon?: CouponOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("coupons")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const isEdit = !!coupon

  const [code, setCode] = useState(coupon?.code ?? "")
  const [discountType, setDiscountType] = useState<CouponDiscountType>(
    coupon?.discount_type ?? "percent"
  )
  const [value, setValue] = useState(coupon?.value ?? "")
  const [minSubtotal, setMinSubtotal] = useState(coupon?.min_subtotal ?? "")
  const [startsAt, setStartsAt] = useState(toLocalInput(coupon?.starts_at ?? null))
  const [endsAt, setEndsAt] = useState(toLocalInput(coupon?.ends_at ?? null))
  const [maxRedemptions, setMaxRedemptions] = useState(
    coupon?.max_redemptions != null ? String(coupon.max_redemptions) : ""
  )
  const [isActive, setIsActive] = useState(coupon?.is_active ?? true)
  const [saving, setSaving] = useState(false)

  async function onSubmit() {
    if (!code.trim()) {
      toast.error(t("validation.codeRequired"))
      return
    }
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error(t("validation.valueRequired"))
      return
    }
    if (discountType === "percent" && numericValue > 100) {
      toast.error(t("validation.percentMax"))
      return
    }

    const payload = {
      code: code.trim(),
      discount_type: discountType,
      value: String(numericValue),
      min_subtotal: minSubtotal.trim() ? String(Number(minSubtotal)) : null,
      starts_at: fromLocalInput(startsAt),
      ends_at: fromLocalInput(endsAt),
      max_redemptions: maxRedemptions.trim() ? Number(maxRedemptions) : null,
      is_active: isActive,
    }

    setSaving(true)
    try {
      if (isEdit) {
        await couponsApi.update(coupon.id, payload)
      } else {
        await couponsApi.create(payload)
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all })
      toast.success(isEdit ? t("updated") : t("created"))
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("fields.code")}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              dir="ltr"
              placeholder="SUMMER10"
            />
            <span className="text-xs text-muted-foreground">
              {t("hints.code")}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.discountType")}</Label>
              <Select
                value={discountType}
                onValueChange={(v) =>
                  setDiscountType((v as CouponDiscountType) ?? "percent")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPES.map((dt) => (
                    <SelectItem key={dt} value={dt}>
                      {t(`discountTypes.${dt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                {discountType === "percent"
                  ? t("fields.percentValue")
                  : t("fields.fixedValue")}
              </Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                dir="ltr"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("fields.minSubtotal")}</Label>
            <Input
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value)}
              dir="ltr"
              inputMode="decimal"
            />
            <span className="text-xs text-muted-foreground">
              {t("hints.minSubtotal")}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.startsAt")}</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("fields.endsAt")}</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("fields.maxRedemptions")}</Label>
            <Input
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              dir="ltr"
              inputMode="numeric"
            />
            <span className="text-xs text-muted-foreground">
              {t("hints.maxRedemptions")}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <Label htmlFor="coupon-active">{t("fields.isActive")}</Label>
            <Switch
              id="coupon-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {c("cancel")}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving}>
            {saving ? c("saving") : isEdit ? c("save") : c("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
