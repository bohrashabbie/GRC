"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { variantsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type { VariantOut } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// Blank means "inherit / not set" and is sent as null, so an empty box never
// becomes "0.00" by accident.
const MONEY_OR_BLANK = /^(\d+(\.\d{1,3})?)?$/

/**
 * Staff think in "the real price, and the offer price if it is on offer".
 * The database stores the pair the other way round: `price` is always what is
 * charged, and `compare_at_price` is the higher number shown struck through.
 *
 * Rather than migrate, this dialog translates between the two. Leave the offer
 * box empty and the real price is simply the price. Fill it in and the offer
 * price becomes what is charged while the real price moves to the struck-through
 * slot. Nothing downstream changes — the storefront already renders that pair.
 */
function useSchema() {
  const t = useTranslations("products")
  return z
    .object({
      real_price: z.string().regex(MONEY_OR_BLANK, t("hints.moneyFormat")),
      offer_price: z.string().regex(MONEY_OR_BLANK, t("hints.moneyFormat")),
      cost_price: z.string().regex(MONEY_OR_BLANK, t("hints.moneyFormat")),
    })
    .refine(
      (v) =>
        !v.offer_price ||
        !v.real_price ||
        Number(v.offer_price) < Number(v.real_price),
      {
        message: t("variants.offerMustBeLower"),
        path: ["offer_price"],
      }
    )
    // An offer with nothing to discount from has no meaning, and the API would
    // reject the pair anyway once it became price + null.
    .refine((v) => !v.offer_price || !!v.real_price, {
      message: t("variants.realPriceRequired"),
      path: ["real_price"],
    })
}

type FormValues = z.infer<ReturnType<typeof useSchema>>

/** Which variants the save lands on besides the one being edited. */
type Scope = "this" | "all" | "pick"
const SCOPES: Scope[] = ["this", "all", "pick"]

export function VariantPriceDialog({
  variant,
  label,
  others,
  productId,
  open,
  onOpenChange,
}: {
  variant: VariantOut
  /** What the variant is called on screen — its option values, not its SKU. */
  label: string
  /**
   * The product's other active variants, which can take the same real and
   * offer price in the same save. Empty for a single-variant product, and the
   * choice is then not shown at all.
   */
  others: { variant: VariantOut; label: string }[]
  productId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const schema = useSchema()
  const [scope, setScope] = useState<Scope>("this")
  const [picked, setPicked] = useState<Set<number>>(new Set())

  function togglePicked(id: number, checked: boolean) {
    setPicked((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const applyTo =
    scope === "all"
      ? others.map((o) => o.variant.id)
      : scope === "pick"
        ? [...picked]
        : []

  // A variant carrying a compare-at price is one that is on offer: the higher
  // number is the real price and what it charges today is the offer.
  const onOffer = !!variant.compare_at_price
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      real_price: (onOffer ? variant.compare_at_price : variant.price) ?? "",
      offer_price: onOffer ? (variant.price ?? "") : "",
      cost_price: variant.cost_price ?? "",
    },
  })

  const offerPrice = form.watch("offer_price")
  const realPrice = form.watch("real_price")
  const discount =
    offerPrice && realPrice && Number(realPrice) > 0
      ? Math.round(
          ((Number(realPrice) - Number(offerPrice)) / Number(realPrice)) * 100
        )
      : null

  async function onSubmit(values: FormValues) {
    const hasOffer = !!values.offer_price
    try {
      await variantsApi.updatePrice(variant.id, {
        // What the customer is charged.
        price: (hasOffer ? values.offer_price : values.real_price) || null,
        // Only an offer produces a struck-through number.
        compare_at_price: hasOffer ? values.real_price : null,
        cost_price: values.cost_price || null,
        apply_to_variant_ids: applyTo,
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.products.variants(productId),
      })
      toast.success(
        applyTo.length > 0
          ? t("variants.priceUpdatedMany", { count: applyTo.length + 1 })
          : t("variants.priceUpdated")
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("variants.editPrice")}</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="real_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("variants.realPrice")}</FormLabel>
                  <FormControl>
                    <Input dir="ltr" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("variants.realPriceHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="offer_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("variants.offerPrice")}</FormLabel>
                  <FormControl>
                    <Input dir="ltr" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormDescription>
                    {discount !== null && discount > 0
                      ? t("variants.offerPreview", { percent: discount })
                      : t("variants.offerPriceHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("variants.columns.costPrice")}</FormLabel>
                  <FormControl>
                    <Input dir="ltr" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormDescription>{t("variants.costPriceHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {others.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">
                  {t("variants.applyTo.title")}
                </legend>
                <div
                  role="radiogroup"
                  aria-label={t("variants.applyTo.title")}
                  className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
                >
                  {SCOPES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={scope === value}
                      onClick={() => setScope(value)}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-sm transition-colors",
                        scope === value
                          ? "bg-background font-medium shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t(`variants.applyTo.${value}`)}
                    </button>
                  ))}
                </div>

                {scope === "pick" && (
                  <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-md border p-3">
                    {others.map((other) => (
                      <li key={other.variant.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`apply-${other.variant.id}`}
                          checked={picked.has(other.variant.id)}
                          onCheckedChange={(checked) =>
                            togglePicked(other.variant.id, checked === true)
                          }
                        />
                        <Label
                          htmlFor={`apply-${other.variant.id}`}
                          className="font-normal"
                        >
                          {other.label}
                        </Label>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-sm text-muted-foreground">
                  {scope === "this"
                    ? t("variants.applyTo.thisHint")
                    : t("variants.applyTo.copyHint", { count: applyTo.length })}
                </p>
              </fieldset>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {c("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? c("saving") : c("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
