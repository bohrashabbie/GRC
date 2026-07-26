"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { locationsApi, stockApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { bilingualName } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { VariantOut } from "@/lib/api/types"

function useAdjustSchema() {
  const t = useTranslations("stock")
  return z.object({
    location_id: z.string().min(1),
    // Zero would create a movement row that changes nothing, so it's rejected
    // client-side as well as server-side.
    qty_delta: z.coerce.number().int().refine((v) => v !== 0, {
      message: t("adjust.qtyRequired"),
    }),
    note: z.string().min(1, t("adjust.noteRequired")),
  })
}

type FormValues = z.infer<ReturnType<typeof useAdjustSchema>>

export function StockAdjustDialog({
  variant,
  open,
  onOpenChange,
  onAdjusted,
}: {
  variant: VariantOut
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdjusted: () => void
}) {
  const t = useTranslations("stock")
  const c = useTranslations("common")
  const locale = useLocale()
  const schema = useAdjustSchema()

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list({ is_active: true }),
    queryFn: ({ signal }) => locationsApi.list({ is_active: true }, signal),
    enabled: open,
  })
  const locations = locationsQuery.data?.items ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { location_id: "", qty_delta: 0, note: "" },
  })

  async function onSubmit(values: FormValues) {
    try {
      const movement = await stockApi.adjust({
        variant_id: variant.id,
        location_id: Number(values.location_id),
        qty_delta: values.qty_delta,
        note: values.note,
      })
      onAdjusted()
      // The resulting movement's balance is surfaced so the user can confirm
      // the adjustment landed where they expected.
      toast.success(
        t("adjust.applied", { balance: movement.balance_after ?? "—" })
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
          <DialogTitle>{t("adjust.title")}</DialogTitle>
          <DialogDescription>{t("adjust.description")}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          <code className="text-xs">{variant.sku}</code>
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("adjust.location")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? "")}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={String(location.id)}>
                          {bilingualName(location, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="qty_delta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("adjust.qtyDelta")}</FormLabel>
                  <FormControl>
                    <Input type="number" dir="ltr" {...field} />
                  </FormControl>
                  <FormDescription>{t("adjust.qtyHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("adjust.note")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>{t("adjust.noteHint")}</FormDescription>
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
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !form.watch("location_id")}
              >
                {form.formState.isSubmitting ? c("saving") : t("adjust.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
