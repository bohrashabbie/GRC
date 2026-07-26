import { defineRouting } from "next-intl/routing"

export const locales = ["ar", "en"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "ar"

/** Arabic is the primary layout direction; English is the toggle. */
export const localeDirections: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
}

export const localeLabels: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Always prefix so the active locale is unambiguous in every URL — a
  // bookmarked/shared admin link keeps the language it was copied in.
  localePrefix: "always",
})

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
