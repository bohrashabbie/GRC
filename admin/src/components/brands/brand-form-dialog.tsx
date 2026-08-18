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
import { Form } from "@/components/ui/form"
import { TranslationNameFields } from "@/components/translations-fields"
import { brandsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import {
  fromNameTranslationForm,
  toNameTranslationForm,
} from "@/lib/translations-form"
import { queryKeys } from "@/lib/query/keys"
import type { BrandOut } from "@/lib/api/types"

function useBrandSchema() {
  const c = useTranslations("catalog")
  return z
    .object({
      translations: z.object({
        ar: z.object({ name: z.string(), slug: z.string() }),
        en: z.object({ name: z.string(), slug: z.string() }),
      }),
    })
    // At least one locale must have a name, or the record has no display value
    // anywhere in the admin or storefront.
    .refine(
      (v) => v.translations.ar.name.trim() || v.translations.en.name.trim(),
      { message: c("validation.nameRequired"), path: ["translations.en.name"] }
    )
}

type FormValues = z.infer<ReturnType<typeof useBrandSchema>>

export function BrandFormDialog({
  brand,
  open,
  onOpenChange,
}: {
  /** Undefined = create mode. */
  brand?: BrandOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("brands")
  const c = useTranslations("common")
  const schema = useBrandSchema()
  const queryClient = useQueryClient()
  const isEdit = !!brand

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      translations: toNameTranslationForm(brand?.translations),
    },
  })

  async function onSubmit(values: FormValues) {
    const translations = fromNameTranslationForm(values.translations)
    try {
      if (isEdit) {
        await brandsApi.update(brand.id, { translations })
      } else {
        await brandsApi.create({ translations })
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.brands.all })
      toast.success(isEdit ? t("updated") : t("created"))
      onOpenChange(false)
    } catch (error) {
      // The name fields are all this form has and zod already guards them, so
      // there is no control left for a server field error to land on.
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <TranslationNameFields control={form.control} />

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
