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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TranslationNameFields } from "@/components/translations-fields"
import { brandsApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
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
      code: z.string().min(1, c("validation.codeRequired")),
      sort_order: z.coerce.number().int(),
      is_active: z.boolean(),
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
const FIELD_NAMES = ["code", "sort_order", "is_active"] as const

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
  const cat = useTranslations("catalog")
  const schema = useBrandSchema()
  const queryClient = useQueryClient()
  const isEdit = !!brand

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: brand?.code ?? "",
      sort_order: brand?.sort_order ?? 0,
      is_active: brand?.is_active ?? true,
      translations: toNameTranslationForm(brand?.translations),
    },
  })

  async function onSubmit(values: FormValues) {
    const translations = fromNameTranslationForm(values.translations)
    try {
      if (isEdit) {
        await brandsApi.update(brand.id, {
          code: values.code,
          sort_order: values.sort_order,
          is_active: values.is_active,
          translations,
        })
      } else {
        await brandsApi.create({
          code: values.code,
          sort_order: values.sort_order,
          is_active: values.is_active,
          translations,
        })
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.brands.all })
      toast.success(isEdit ? t("updated") : t("created"))
      onOpenChange(false)
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        const unmatched = applyFieldErrors(error, form.setError, FIELD_NAMES)
        if (unmatched.length > 0) {
          toast.error(unmatched.map((f) => f.message).join(" "))
        }
        return
      }
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
            <TranslationNameFields control={form.control} showSlug />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{cat("fields.code")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" disabled={isEdit} {...field} />
                    </FormControl>
                    {!isEdit && (
                      <FormDescription>{cat("hints.code")}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="brand-active">{cat("fields.isActive")}</Label>
                    <FormControl>
                      <Switch
                        id="brand-active"
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
