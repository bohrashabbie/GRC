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
const MONEY_OR_BLANK = /^(\d+(\.\d{1,2})?)?$/

const schema = z.object({
  price: z.string().regex(MONEY_OR_BLANK),
  compare_at_price: z.string().regex(MONEY_OR_BLANK),
  cost_price: z.string().regex(MONEY_OR_BLANK),
})
type FormValues = z.infer<typeof schema>

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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      price: variant.price ?? "",
      compare_at_price: variant.compare_at_price ?? "",
      cost_price: variant.cost_price ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      await variantsApi.updatePrice(variant.id, {
        price: values.price || null,
        compare_at_price: values.compare_at_price || null,
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
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("variants.columns.price")}</FormLabel>
                  <FormControl>
                    <Input dir="ltr" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compare_at_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("variants.columns.comparePrice")}</FormLabel>
                  <FormControl>
                    <Input dir="ltr" inputMode="decimal" {...field} />
                  </FormControl>
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
