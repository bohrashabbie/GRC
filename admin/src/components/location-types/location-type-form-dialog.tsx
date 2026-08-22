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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TranslationNameFields } from "@/components/translations-fields"
import { locationTypesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import {
  fromLabelTranslationForm,
  toLabelTranslationForm,
} from "@/lib/translations-form"
import { queryKeys } from "@/lib/query/keys"
import type { LocationTypeOut } from "@/lib/api/types"

function useLocationTypeSchema() {
  const c = useTranslations("catalog")
  return z
    .object({
      sort_order: z.coerce.number().int(),
      is_active: z.boolean(),
      translations: z.object({
        ar: z.object({ label: z.string() }),
        en: z.object({ label: z.string() }),
      }),
    })
    .refine(
      (v) => v.translations.ar.label.trim() || v.translations.en.label.trim(),
      { message: c("validation.labelRequired"), path: ["translations.en.label"] }
    )
}

type FormValues = z.infer<ReturnType<typeof useLocationTypeSchema>>

export function LocationTypeFormDialog({
  locationType,
  open,
  onOpenChange,
}: {
  /** Undefined = create mode. */
  locationType?: LocationTypeOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("locationTypes")
  const c = useTranslations("common")
  const cat = useTranslations("catalog")
  const schema = useLocationTypeSchema()
  const queryClient = useQueryClient()
  const isEdit = !!locationType

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sort_order: locationType?.sort_order ?? 0,
      is_active: locationType?.is_active ?? true,
      translations: toLabelTranslationForm(locationType?.translations),
    },
  })

  async function onSubmit(values: FormValues) {
    const translations = fromLabelTranslationForm(values.translations)
    try {
      if (isEdit) {
        await locationTypesApi.update(locationType.id, {
          sort_order: values.sort_order,
          is_active: values.is_active,
          translations,
        })
      } else {
        await locationTypesApi.create({
          sort_order: values.sort_order,
          is_active: values.is_active,
          translations,
        })
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.locationTypes.all })
      toast.success(isEdit ? t("updated") : t("created"))
      onOpenChange(false)
    } catch (error) {
      // Only the labels are typed here and zod already guards them, so a
      // server error belongs in a toast rather than on a field.
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <TranslationNameFields control={form.control} field="label" />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{cat("fields.sortOrder")}</FormLabel>
                  <FormControl>
                    <Input type="number" dir="ltr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="loc-type-active">{t("fields.isActive")}</Label>
                    <FormControl>
                      <Switch
                        id="loc-type-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
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
                {form.formState.isSubmitting
                  ? c("saving")
                  : isEdit
                    ? c("save")
                    : c("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
