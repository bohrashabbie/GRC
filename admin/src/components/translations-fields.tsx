"use client"

import { useTranslations } from "next-intl"
import { type Control, type FieldValues, type Path } from "react-hook-form"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { locales } from "@/i18n/routing"

/**
 * Arabic and English side by side, because a catalog record is only really
 * complete when both locales are filled in. Translations are separate rows
 * keyed by locale (CLAUDE.md rule 9), so the form flattens them into
 * `translations.ar.name` / `translations.en.name` and the caller reassembles
 * them into the array shape the API expects.
 */
export function TranslationNameFields<T extends FieldValues>({
  control,
  /** "name" for SEO/product translations, "label" for options. */
  field = "name",
  showSlug = false,
}: {
  control: Control<T>
  field?: "name" | "label"
  showSlug?: boolean
}) {
  const t = useTranslations("catalog")

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {locales.map((locale) => (
        <div key={locale} className="flex flex-col gap-3">
          <FormField
            control={control}
            name={`translations.${locale}.${field}` as Path<T>}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>
                  {field === "label"
                    ? t(`fields.label_${locale}`)
                    : t(`fields.name_${locale}`)}
                </FormLabel>
                <FormControl>
                  <Input dir={locale === "ar" ? "rtl" : "ltr"} {...f} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {showSlug && (
            <FormField
              control={control}
              name={`translations.${locale}.slug` as Path<T>}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>{t(`fields.slug_${locale}`)}</FormLabel>
                  <FormControl>
                    <Input dir="ltr" {...f} />
                  </FormControl>
                  <FormDescription>{t("hints.slugPerLocale")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
