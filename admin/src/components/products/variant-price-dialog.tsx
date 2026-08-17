"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
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
import { variantsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type { VariantOut } from "@/lib/api/types"

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

export function VariantPriceDialog({
  variant,
  productId,
  open,
  onOpenChange,
}: {
  variant: VariantOut
  productId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const schema = useSchema()

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
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.products.variants(productId),
      })
      toast.success(t("variants.priceUpdated"))
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
          <DialogDescription>{variant.sku}</DialogDescription>
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
