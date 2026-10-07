"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useLocale } from "next-intl";

import type { Locale } from "@/i18n/routing";
import { KWD, type CurrencyOption, type SelectedCurrency } from "@/lib/currency";
import { formatPrice, type Money } from "@/lib/format";

interface CurrencyState {
  selected: SelectedCurrency;
  options: CurrencyOption[];
}

const CurrencyContext = createContext<CurrencyState>({ selected: KWD, options: [] });

/** Set once in the layout from the visitor's cookie. */
export function CurrencyProvider({
  selected,
  options,
  children,
}: CurrencyState & { children: ReactNode }) {
  return (
    <CurrencyContext.Provider value={{ selected, options }}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyState {
  return useContext(CurrencyContext);
}

/**
 * Formats a KWD amount in the visitor's chosen currency. Display only — use
 * plain `formatPrice` wherever the KD figure is the record (checkout total,
 * orders).
 */
export function useFormatPrice(): (amount: Money) => string {
  const { selected } = useCurrency();
  const locale = useLocale() as Locale;
  return useCallback((amount: Money) => formatPrice(amount, locale, selected), [locale, selected]);
}
