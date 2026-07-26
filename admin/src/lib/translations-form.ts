import { locales, type Locale } from "@/i18n/routing"
import type {
  LabelTranslationIn,
  LabelTranslationOut,
  SeoTranslationIn,
  SeoTranslationOut,
} from "@/lib/api/types"

/**
 * The API stores translations as one row per locale; forms are easier to write
 * keyed by locale. These convert between the two shapes so no page has to
 * hand-roll the mapping (and accidentally drop a locale).
 */

export type NameTranslationForm = Record<
  Locale,
  { name: string; slug: string }
>

export type LabelTranslationForm = Record<Locale, { label: string }>

export function toNameTranslationForm(
  translations: SeoTranslationOut[] | undefined
): NameTranslationForm {
  const form = {} as NameTranslationForm
  for (const locale of locales) {
    const row = translations?.find((t) => t.locale === locale)
    form[locale] = { name: row?.name ?? "", slug: row?.slug ?? "" }
  }
  return form
}

export function fromNameTranslationForm(
  form: NameTranslationForm
): SeoTranslationIn[] {
  return locales
    .filter((locale) => form[locale]?.name?.trim())
    .map((locale) => ({
      locale,
      name: form[locale].name.trim(),
      // Empty slug is sent as null so the backend generates one rather than
      // trying to store an empty string in a per-locale unique column.
      slug: form[locale].slug?.trim() ? form[locale].slug.trim() : null,
    }))
}

export function toLabelTranslationForm(
  translations: LabelTranslationOut[] | undefined
): LabelTranslationForm {
  const form = {} as LabelTranslationForm
  for (const locale of locales) {
    form[locale] = {
      label: translations?.find((t) => t.locale === locale)?.label ?? "",
    }
  }
  return form
}

export function fromLabelTranslationForm(
  form: LabelTranslationForm
): LabelTranslationIn[] {
  return locales
    .filter((locale) => form[locale]?.label?.trim())
    .map((locale) => ({ locale, label: form[locale].label.trim() }))
}
