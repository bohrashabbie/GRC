"use client"

import { useQueryClient } from "@tanstack/react-query"
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
import { ordersApi } from "@/lib/api/endpoints"
import { isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { formatMoney } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { PaymentOut } from "@/lib/api/types"

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/

export function OrderRefundDialog({
  orderId,
  payment,
  currency,
  open,
  onOpenChange,
}: {
  orderId: number
  payment: PaymentOut
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("orders")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()

  // Money stays a string throughout; only this comparison parses it, and the
  // backend re-validates the remaining balance anyway.
  const remaining = (
    Number(payment.amount) - Number(payment.refunded_amount)
  ).toFixed(2)

  const [amount, setAmount] = useState(remaining)
  const [reason, setReason] = useState("")
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate(): string | null {
    if (!MONEY_PATTERN.test(amount) || Number(amount) <= 0) {
      return t("refund.amountRequired")
    }
    if (Number(amount) > Number(remaining)) {
      return t("refund.amountTooHigh", {
        max: formatMoney(remaining, locale, currency),
      })
    }
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      setInlineError(validationError)
      return
    }
    setInlineError(null)
    setIsSubmitting(true)
    try {
      await ordersApi.refund(orderId, {
        payment_id: payment.id,
        amount,
        reason: reason.trim() || null,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      toast.success(t("refund.done"))
      onOpenChange(false)
    } catch (error) {
      // Business-rule failures (over-refund, uncaptured payment) belong next
      // to the amount field, not in a toast the user has to remember.
      if (isApiError(error) && error.isBusinessRule) {
        setInlineError(error.message)
        return
      }
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("refund.title")}</DialogTitle>
          <DialogDescription>{t("refund.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refund-amount">{t("refund.amount")}</Label>
            <Input
              id="refund-amount"
              dir="ltr"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setInlineError(null)
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t("refund.amountHint", {
                max: formatMoney(remaining, locale, currency),
              })}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refund-reason">{t("refund.reason")}</Label>
            <Input
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {inlineError && (
            <Alert variant="destructive">
              <AlertDescription>{inlineError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {c("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? c("saving") : t("refund.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
