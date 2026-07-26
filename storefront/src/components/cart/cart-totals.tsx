"use client";

import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/format";
import type { Cart } from "@/types/shop";
import { cn } from "@/lib/utils";

/**
 * Renders server-computed totals. Every value here is a string that arrived
 * from the cart endpoint — nothing on this component adds, multiplies, or
 * applies a rate.
 */
export function CartTotalsBlock({ cart, className }: { cart: Cart; className?: string }) {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;

  const rows: { label: string; value: string; tone?: "discount" | "muted" }[] = [
    { label: t("subtotal"), value: formatPrice(cart.totals.subtotal, locale) },
  ];

  if (Number(cart.totals.discount_total) > 0) {
    rows.push({
      label: t("discount"),
      value: `−${formatPrice(cart.totals.discount_total, locale)}`,
      tone: "discount",
    });
  }

  rows.push({
    label: t("shipping"),
    value:
      Number(cart.totals.shipping_total) === 0
        ? t("shippingFree")
        : formatPrice(cart.totals.shipping_total, locale),
  });

  return (
    <div className={cn("space-y-2.5", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 text-sm">
          <span className="text-ink-500">{row.label}</span>
          {/* `dir="ltr"` keeps a leading minus on the correct side of the
              figure in Arabic, where it would otherwise reorder. */}
          <span
            dir="ltr"
            className={cn(
              "tabular",
              row.tone === "discount" ? "text-brick-600" : "text-ink-800",
            )}
          >
            {row.value}
          </span>
        </div>
      ))}

      <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-3">
        <span className="text-sm font-semibold text-ink-900">{t("total")}</span>
        <span className="tabular text-lg font-semibold text-ink-900">
          {formatPrice(cart.totals.grand_total, locale)}
        </span>
      </div>

      <p className="text-2xs text-ink-400">
        {t("tax")} · {formatPrice(cart.totals.tax_total, locale)}
      </p>
    </div>
  );
}

/** Progress toward the free-shipping threshold. */
export function FreeShippingBar({ cart }: { cart: Cart }) {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;

  const remaining = cart.totals.free_shipping_remaining;
  const threshold = Number(cart.totals.free_shipping_threshold);
  const reached = remaining === null;

  // Purely a visual proportion, derived from two server figures — it is not
  // used to decide whether shipping is actually free.
  const progress = reached
    ? 100
    : Math.min(100, Math.max(0, ((threshold - Number(remaining)) / threshold) * 100));

  return (
    <div className="border-b border-hairline px-5 py-4">
      <p className={cn("text-xs", reached ? "text-palm-600" : "text-ink-600")}>
        {reached
          ? t("freeShippingReached")
          : t("freeShippingRemaining", { amount: formatPrice(remaining, locale) })}
      </p>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sand-200">
        <div
          className={cn("h-full transition-all duration-500", reached ? "bg-palm-600" : "bg-gold-500")}
          style={{ inlineSize: `${progress}%` }}
        />
      </div>
    </div>
  );
}
