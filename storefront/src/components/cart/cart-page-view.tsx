"use client";

import { useLocale, useTranslations } from "next-intl";

import { useCart } from "./cart-provider";
import { CartTotalsBlock, FreeShippingBar } from "./cart-totals";
import { Link, useRouter } from "@/i18n/navigation";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useSession } from "@/components/account/session-provider";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/format";

/**
 * Full-page cart. Shares the totals and free-shipping components with the
 * drawer, so the two can never disagree about what an order costs.
 */
export function CartPageView() {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { requireLogin } = useSession();
  const { cart, isLoading, setQuantity, removeItem } = useCart();

  function onCheckout() {
    if (!requireLogin("checkout")) return;
    router.push("/checkout");
  }

  if (isLoading) {
    return <p className="py-24 text-center text-sm text-ink-400">…</p>;
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-h2 text-ink-900">{t("empty")}</p>
        <Link
          href="/c"
          className="mt-6 inline-flex h-12 items-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50 transition-colors hover:bg-palm-700"
        >
          {t("emptyAction")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
      <ul className="divide-y divide-hairline border-y border-hairline">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex gap-5 py-6">
            <Link href={`/p/${line.product_slug}`} className="block w-24 shrink-0 bg-sand-100 sm:w-32">
              {line.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={line.image.url} alt="" className="aspect-[2/3] w-full object-cover" />
              )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Link
                href={`/p/${line.product_slug}`}
                className="text-sm text-ink-800 hover:text-ink-900"
              >
                {line.name}
              </Link>
              {line.options_label && (
                <p className="text-2xs text-ink-400">{line.options_label}</p>
              )}
              <p className="tabular text-2xs text-ink-400" dir="ltr">
                {line.sku}
              </p>

              {line.stock_state === "out_of_stock" && (
                <p className="text-2xs text-brick-600">{t("lineSoldOut")}</p>
              )}

              <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
                <QuantityStepper
                  value={line.quantity}
                  max={line.max_quantity ?? undefined}
                  onChange={(next) => void setQuantity(line.variant_id, next)}
                />
                <button
                  type="button"
                  onClick={() => void removeItem(line.variant_id)}
                  className="text-2xs text-ink-400 underline underline-offset-4 hover:text-brick-600"
                >
                  {t("remove")}
                </button>
              </div>
            </div>

            <div className="shrink-0 text-end">
              <p className="tabular text-sm font-semibold text-ink-900">
                {formatPrice(line.line_total, locale)}
              </p>
              {line.quantity > 1 && (
                <p className="tabular mt-1 text-2xs text-ink-400">
                  {formatPrice(line.unit_price, locale)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:sticky lg:top-32 lg:self-start">
        <div className="border border-hairline bg-surface">
          <FreeShippingBar cart={cart} />
          <div className="p-5">
            <CartTotalsBlock cart={cart} />
            <button
              type="button"
              onClick={onCheckout}
              className="mt-5 flex h-13 w-full items-center justify-center rounded-xs bg-palm-600 text-sm font-medium text-sand-50 transition-colors hover:bg-palm-700"
            >
              {t("checkout")}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
