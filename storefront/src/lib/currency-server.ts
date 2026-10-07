import { cookies } from "next/headers";

import type { Locale } from "@/i18n/routing";
import {
  CURRENCY_COOKIE_NAME,
  KWD,
  currencyDecimals,
  flagFor,
  type CurrencyOption,
  type SelectedCurrency,
} from "@/lib/currency";
import { getCurrencies } from "@/lib/shop-api";

/**
 * Display currencies with today's rates, named in the visitor's language, and
 * the one the visitor chose (KWD unless they picked another). Read in the
 * layout, so the first paint is already in their currency.
 */
export async function getCurrencyState(
  locale: Locale,
): Promise<{ selected: SelectedCurrency; options: CurrencyOption[] }> {
  const rates = await getCurrencies(locale);
  const names = new Intl.DisplayNames([locale], { type: "currency" });
  const regions = new Intl.DisplayNames(["en"], { type: "region" });

  const options: CurrencyOption[] = rates.map((rate) => ({
    ...rate,
    decimals: currencyDecimals(rate.code),
    name: names.of(rate.code) ?? rate.code,
    flag: flagFor(rate.code, regions),
  }));

  const wanted = (await cookies()).get(CURRENCY_COOKIE_NAME)?.value?.toUpperCase();
  const chosen = options.find((option) => option.code === wanted);
  const selected = chosen
    ? { code: chosen.code, rate: chosen.rate, decimals: chosen.decimals }
    : KWD;
  return { selected, options };
}
