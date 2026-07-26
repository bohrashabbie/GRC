import type { Locale } from "@/i18n/routing";

/**
 * Money arrives from the API as a decimal *string* ("349.00"), never a number.
 * The backend stores SAR as NUMERIC(12,2); parsing it into a JS float on the
 * way in would reintroduce exactly the precision loss that rule is there to
 * prevent. These helpers format the string for display and never do arithmetic
 * on it — every total, discount and tax figure is computed server-side.
 */
export type Money = string;

/**
 * `ar-SA` defaults to Eastern Arabic numerals (٣٤٩). Saudi ecommerce shows
 * Western digits for prices, sizes and order numbers essentially without
 * exception, so we pin the numbering system rather than inherit the locale's.
 */
const NUMERIC_LOCALE: Record<Locale, string> = {
  ar: "ar-SA-u-nu-latn",
  en: "en-SA",
};

export function formatPrice(amount: Money, locale: Locale): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;

  return new Intl.NumberFormat(NUMERIC_LOCALE[locale], {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Prices without the currency mark — for compact rails and swatch labels. */
export function formatAmount(amount: Money, locale: Locale): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;

  return new Intl.NumberFormat(NUMERIC_LOCALE[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(NUMERIC_LOCALE[locale]).format(value);
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(NUMERIC_LOCALE[locale], {
    dateStyle: "medium",
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

/**
 * Discount percentage for a sale badge. Derived from two server-supplied
 * prices purely for display — it is a label, not a calculation the checkout
 * ever depends on.
 */
export function discountPercent(price: Money, compareAt: Money): number | null {
  const now = Number(price);
  const was = Number(compareAt);
  if (!Number.isFinite(now) || !Number.isFinite(was) || was <= now || was <= 0) {
    return null;
  }
  return Math.round(((was - now) / was) * 100);
}
