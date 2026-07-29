import type {
  LabelTranslationOut,
  ProductTranslationOut,
  SeoTranslationOut,
} from "@/lib/api/types"

/**
 * Money arrives from the API as a NUMERIC(12,3) string in KWD, VAT-inclusive.
 * It is never parsed into a float and never recomputed client-side — the
 * backend owns every price and VAT calculation. This only formats for display.
 * KWD is subdivided into 1000 fils, so it's shown to 3 decimals, not 2.
 */
export function formatMoney(
  amount: string | null | undefined,
  locale: string,
  currency = "KWD"
): string {
  if (amount === null || amount === undefined || amount === "") return "—"
  const numeric = Number(amount)
  if (Number.isNaN(numeric)) return amount
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(numeric)
}

/** VAT rates are stored as a fraction (0.1500), shown as a percentage. */
export function formatTaxRate(rate: string | null | undefined, locale: string): string {
  if (!rate) return "—"
  const numeric = Number(rate)
  if (Number.isNaN(numeric)) return rate
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(numeric)
}

type AnyTranslation =
  | SeoTranslationOut
  | ProductTranslationOut
  | LabelTranslationOut

/**
 * Picks the translation row for the active locale, falling back to the other
 * locale rather than rendering blank — an admin should always see *something*
 * identifiable even if one language hasn't been filled in yet.
 */
export function pickTranslation<T extends AnyTranslation>(
  translations: T[] | undefined,
  locale: string
): T | undefined {
  if (!translations || translations.length === 0) return undefined
  return translations.find((t) => t.locale === locale) ?? translations[0]
}

/** Display name for anything carrying SEO/product translations. */
export function translatedName(
  translations: (SeoTranslationOut | ProductTranslationOut)[] | undefined,
  locale: string,
  fallback = "—"
): string {
  return pickTranslation(translations, locale)?.name ?? fallback
}

/** Display label for options/option values, which use `label` not `name`. */
export function translatedLabel(
  translations: LabelTranslationOut[] | undefined,
  locale: string,
  fallback = "—"
): string {
  return pickTranslation(translations, locale)?.label ?? fallback
}

/** Bilingual name for records with plain name_ar/name_en columns
 * (locations and roles — these predate the translations tables). */
export function bilingualName(
  record: { name_ar: string; name_en: string },
  locale: string
): string {
  return locale === "ar" ? record.name_ar : record.name_en
}

/**
 * Public URL for an uploaded file. The API serves /uploads from its own origin
 * (one directory above /api/v1), so the base URL is trimmed rather than
 * assuming the admin and the API share a host.
 */
export function mediaUrl(storageKey: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/api\/v1\/?$/, "")
  return `${base}/uploads/${storageKey}`
}

/** Customers can have neither name filled in, so callers pass a fallback
 * rather than rendering an empty cell. */
export function customerName(
  customer: { first_name: string | null; last_name: string | null },
  fallback: string
): string {
  const name = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  return name || fallback
}
