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
const PICKER_FALLBACK = "#1B3A2F"

/**
 * `<input type="color">` accepts only full #rrggbb, so a stored shorthand like
 * #ccc has to be expanded or the control silently falls back to black and the
 * box stops matching the hex written beside it.
 */
function pickerValue(hex: string | undefined): string {
  if (!hex || !HEX_PATTERN.test(hex)) return PICKER_FALLBACK
  if (hex.length === 7) return hex
  const [, r, g, b] = hex
  return `#${r}${r}${g}${g}${b}${b}`
}

const CM_PER_INCH = 2.54

/** Centimetres from the API, shown as the inches staff measure in. */
function toInches(cm: number | null | undefined): number | "" {
  if (cm === null || cm === undefined) return ""
  return Math.round((cm / CM_PER_INCH) * 10) / 10
}

/** Back to whole centimetres, which is what the column stores. */
function toCentimetres(inches: number): number {
  return Math.round(inches * CM_PER_INCH)
}

function useValueSchema() {
  const c = useTranslations("catalog")
  const o = useTranslations("options")
  // Empty string means "not entered" — the literal must come first so ""
  // never reaches the numeric coercion (which would turn it into 0).
  // Staff work in inches; the column is centimetres, so the form converts on
  // the way in and out. 197 in is the 500 cm the API accepts.
  const measurement = z.literal("").or(z.coerce.number().min(0.5).max(197))
  return z
    .object({
      hex_color: z
        .string()
        .regex(HEX_PATTERN, o("values.hexHint"))
        .or(z.literal("")),
      length_cm: measurement,
      width_cm: measurement,
      tag: z.string().max(24),
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
const FIELD_NAMES = ["hex_color", "length_cm", "width_cm", "tag", "sort_order"] as const

export function OptionValueFormDialog({
  optionId,
  value,
  withSwatch,
  withMeasurements,
  open,
  onOpenChange,
}: {
  optionId: number
  value?: OptionValueOut
  /** Colour values carry a swatch; size values carry garment measurements. */
  withSwatch: boolean
  withMeasurements: boolean
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
      hex_color: value?.hex_color ?? "",
      length_cm: toInches(value?.length_cm),
      width_cm: toInches(value?.width_cm),
      tag: value?.tag ?? "",
      sort_order: value?.sort_order ?? 0,
      translations: toLabelTranslationForm(value?.translations),
    },
  })

  /** "= 150 cm" under an inches box, or nothing while it is empty. */
  function equivalent(raw: string): string {
    const inches = Number(raw)
    if (!raw.trim() || !Number.isFinite(inches) || inches <= 0) return ""
    return t("values.equivalentCm", { cm: toCentimetres(inches) })
  }

  async function onSubmit(values: FormValues) {
    const translations = fromLabelTranslationForm(values.translations)
    const hex = withSwatch && values.hex_color ? values.hex_color : null
    const lengthCm =
      withMeasurements && values.length_cm !== ""
        ? toCentimetres(values.length_cm)
        : null
    const widthCm =
      withMeasurements && values.width_cm !== ""
        ? toCentimetres(values.width_cm)
        : null
    try {
      if (isEdit) {
        await optionValuesApi.update(value.id, {
          hex_color: hex,
          length_cm: lengthCm,
          width_cm: widthCm,
          tag: values.tag.trim() || null,
          sort_order: values.sort_order,
          translations,
        })
      } else {
        await optionValuesApi.create({
          option_id: optionId,
          hex_color: hex,
          length_cm: lengthCm,
          width_cm: widthCm,
          tag: values.tag.trim() || null,
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
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("values.tag")}</FormLabel>
                    <FormControl>
                      <Input maxLength={24} {...field} />
                    </FormControl>
                    <FormDescription>{t("values.tagHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {withMeasurements && (
              <div className="flex flex-col gap-1.5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="length_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("values.lengthIn")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            dir="ltr"
                            step="0.1"
                            min={0.5}
                            max={197}
                            {...field}
                          />
                        </FormControl>
                        {/* The stored value is centimetres, so it is shown
                            rather than hidden — staff quote both. */}
                        <FormDescription>
                          {equivalent(String(field.value ?? ""))}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="width_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("values.widthIn")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            dir="ltr"
                            step="0.1"
                            min={0.5}
                            max={197}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {equivalent(String(field.value ?? ""))}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {/* Not FormDescription: that hook needs a FormField context,
                    and this hint describes the pair of fields, not one. */}
                <p className="text-xs text-muted-foreground">
                  {t("values.measurementsHint")}
                </p>
              </div>
            )}

            {withSwatch && (
              <FormField
                control={form.control}
                name="hex_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("values.hexColor")}</FormLabel>
                    <div className="flex items-center gap-2">
                      {/* The box is the control staff actually use — click it
                          and pick. The text field stays alongside it because a
                          brand colour arrives as a hex to paste, not a colour
                          to hunt for by eye. Both write the same field. */}
                      <input
                        type="color"
                        aria-label={t("values.picker")}
                        value={pickerValue(field.value)}
                        onChange={(event) => field.onChange(event.target.value)}
                        className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1"
                      />
                      <FormControl>
                        <Input dir="ltr" placeholder="#1B3A2F" {...field} />
                      </FormControl>
                    </div>
                    <FormDescription>{t("values.hexHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
