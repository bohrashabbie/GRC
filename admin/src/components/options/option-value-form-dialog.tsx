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
import { TranslationNameFields } from "@/components/translations-fields"
import { optionValuesApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import {
  fromLabelTranslationForm,
  toLabelTranslationForm,
} from "@/lib/translations-form"
import { queryKeys } from "@/lib/query/keys"
import type { OptionValueOut } from "@/lib/api/types"

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function normalizeHex(hex?: string): string {
  if (!hex || !HEX_PATTERN.test(hex)) return "#000000"
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase()
  }
  return hex.toUpperCase()
}

function useValueSchema() {
  const c = useTranslations("catalog")
  const o = useTranslations("options")
  return z
    .object({
      code: z.string().min(1, c("validation.codeRequired")),
      hex_color: z
        .string()
        .regex(HEX_PATTERN, o("values.hexHint"))
        .or(z.literal("")),
      sort_order: z.coerce.number().int(),
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

type FormValues = z.infer<ReturnType<typeof useValueSchema>>
const FIELD_NAMES = ["code", "hex_color", "sort_order"] as const

export function OptionValueFormDialog({
  optionId,
  value,
  open,
  onOpenChange,
}: {
  optionId: number
  value?: OptionValueOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("options")
  const c = useTranslations("common")
  const cat = useTranslations("catalog")
  const schema = useValueSchema()
  const queryClient = useQueryClient()
  const isEdit = !!value

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: value?.code ?? "",
      hex_color: value?.hex_color ?? "",
      sort_order: value?.sort_order ?? 0,
      translations: toLabelTranslationForm(value?.translations),
    },
  })

  async function onSubmit(values: FormValues) {
    const translations = fromLabelTranslationForm(values.translations)
    const hex = values.hex_color ? values.hex_color : null
    try {
      if (isEdit) {
        // The API doesn't allow changing an option value's code after creation.
        await optionValuesApi.update(value.id, {
          hex_color: hex,
          sort_order: values.sort_order,
          translations,
        })
      } else {
        await optionValuesApi.create({
          option_id: optionId,
          code: values.code,
          hex_color: hex,
          sort_order: values.sort_order,
          translations,
        })
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.options.values(optionId),
      })
      toast.success(isEdit ? t("values.updated") : t("values.created"))
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

  const hexPreview = form.watch("hex_color")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("values.editTitle") : t("values.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("values.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <TranslationNameFields control={form.control} field="label" />

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
              name="hex_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("values.hexColor")}</FormLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={normalizeHex(field.value)}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="size-9 p-0.5 cursor-pointer rounded-md border border-input bg-background shrink-0 transition-colors hover:border-accent"
                      title="Pick a color"
                    />
                    <FormControl>
                      <Input dir="ltr" placeholder="#1B3A2F" {...field} />
                    </FormControl>
                    {HEX_PATTERN.test(hexPreview ?? "") && (
                      <span
                        aria-hidden
                        className="size-9 shrink-0 rounded-md border border-border shadow-sm"
                        style={{ backgroundColor: hexPreview }}
                      />
                    )}
                  </div>
                  <FormDescription>{t("values.hexHint")}</FormDescription>
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
