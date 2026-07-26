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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { TranslationNameFields } from "@/components/translations-fields"
import { optionsApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { OPTION_INPUT_TYPES, humanizeStatus } from "@/lib/status"
import {
  fromLabelTranslationForm,
  toLabelTranslationForm,
} from "@/lib/translations-form"
import { queryKeys } from "@/lib/query/keys"
import type { OptionOut } from "@/lib/api/types"

function useOptionSchema() {
  const c = useTranslations("catalog")
  return z
    .object({
      code: z.string().min(1, c("validation.codeRequired")),
      input_type: z.string().min(1),
      is_filterable: z.boolean(),
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

type FormValues = z.infer<ReturnType<typeof useOptionSchema>>
const FIELD_NAMES = ["code", "input_type", "sort_order"] as const

export function OptionFormDialog({
  option,
  open,
  onOpenChange,
}: {
  option?: OptionOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("options")
  const c = useTranslations("common")
  const cat = useTranslations("catalog")
  const schema = useOptionSchema()
  const queryClient = useQueryClient()
  const isEdit = !!option

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: option?.code ?? "",
      input_type: option?.input_type ?? OPTION_INPUT_TYPES[0],
      is_filterable: option?.is_filterable ?? false,
      sort_order: option?.sort_order ?? 0,
      translations: toLabelTranslationForm(option?.translations),
    },
  })

  async function onSubmit(values: FormValues) {
    const translations = fromLabelTranslationForm(values.translations)
    try {
      if (isEdit) {
        await optionsApi.update(option.id, {
          code: values.code,
          input_type: values.input_type,
          is_filterable: values.is_filterable,
          sort_order: values.sort_order,
          translations,
        })
      } else {
        await optionsApi.create({
          code: values.code,
          input_type: values.input_type,
          is_filterable: values.is_filterable,
          sort_order: values.sort_order,
          translations,
        })
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.options.all })
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
      <DialogContent>
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
                name="input_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.inputType")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPTION_INPUT_TYPES.map((it) => (
                          <SelectItem key={it} value={it}>
                            {humanizeStatus(it)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              name="is_filterable"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="opt-filterable">
                      {t("fields.isFilterable")}
                    </Label>
                    <FormControl>
                      <Switch
                        id="opt-filterable"
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
