"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "./cart-provider";
import { CartTotalsBlock, FreeShippingBar } from "./cart-totals";
import { CloseIcon } from "@/components/ui/icons";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useSession } from "@/components/account/session-provider";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { requireLogin } = useSession();
  const { cart, isOpen, close, setQuantity, removeItem, applyCoupon, removeCoupon, couponError } =
    useCart();

  function onCheckout() {
    // Close first regardless of outcome — the login prompt (if it opens)
    // should appear over the page, not stacked on top of the still-open
    // drawer.
    close();
    if (!requireLogin("checkout")) return;
    router.push("/checkout");
  }

  const [couponInput, setCouponInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const isEmpty = !cart || cart.lines.length === 0;

  return (
    <div
      aria-hidden={!isOpen}
      className={cn("fixed inset-0 z-50", isOpen ? "pointer-events-auto" : "pointer-events-none")}
    >
      <div
        onClick={close}
        className={cn(
          "absolute inset-0 bg-ink-900/45 transition-opacity duration-200 ease-out-soft",
          isOpen ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Enters from the inline-end edge — the side the cart icon sits on in
          both directions. */}
      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-label={t("title")}
        className={cn(
          "absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-sand-50 shadow-overlay",
          "transition-transform duration-250 ease-out-soft",
          isOpen ? "translate-x-0" : "translate-x-full rtl:-translate-x-full",
        )}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-5">
          <h2 className="font-display text-h3 text-ink-900">{t("title")}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={tCommon("close")}
            className="inline-flex size-9 items-center justify-center text-ink-700"
          >
            <CloseIcon className="size-5" />
          </button>
        </header>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-ink-500">{t("empty")}</p>
            <Link
              href="/c"
              onClick={close}
              className="inline-flex h-11 items-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50"
            >
              {t("emptyAction")}
            </Link>
          </div>
        ) : (
          <>
            <FreeShippingBar cart={cart} />

            <ul className="flex-1 divide-y divide-hairline overflow-y-auto overscroll-contain px-5">
              {cart.lines.map((line) => (
                <li key={line.id} className="flex gap-4 py-5">
                  <Link
                    href={`/p/${line.product_slug}`}
                    onClick={close}
                    className="block w-20 shrink-0 bg-sand-100"
                  >
                    {line.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={line.image.url}
                        alt=""
                        className="aspect-[2/3] w-full object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Link
                      href={`/p/${line.product_slug}`}
                      onClick={close}
                      className="text-sm leading-snug text-ink-800 hover:text-ink-900"
                    >
                      {line.name}
                    </Link>
                    {line.options_label && (
                      <p className="text-2xs text-ink-400">{line.options_label}</p>
                    )}

                    {line.stock_state === "out_of_stock" && (
                      <p className="text-2xs text-brick-600">{t("lineSoldOut")}</p>
                    )}
                    {line.max_quantity !== null && line.max_quantity > 0 && (
                      <p className="text-2xs text-brick-600">
                        {t("maxQuantity", { count: line.max_quantity })}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                      <QuantityStepper
                        value={line.quantity}
                        max={line.max_quantity ?? undefined}
                        onChange={(next) => void setQuantity(line.variant_id, next)}
                      />
                      <span className="tabular text-sm font-semibold text-ink-900">
                        {formatPrice(line.line_total, locale)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void removeItem(line.variant_id)}
                      className="self-start text-2xs text-ink-400 underline underline-offset-4 hover:text-brick-600"
                    >
                      {t("remove")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="shrink-0 space-y-4 border-t border-hairline px-5 py-5">
              {cart.coupon ? (
                <div className="flex items-center justify-between gap-3 bg-sand-100 px-3 py-2.5">
                  <span className="text-xs text-ink-700">{cart.coupon.label}</span>
                  <button
                    type="button"
                    onClick={() => void removeCoupon()}
                    className="text-2xs text-ink-400 underline underline-offset-4 hover:text-brick-600"
                  >
                    {t("couponRemove")}
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const ok = await applyCoupon(couponInput);
                    if (ok) setCouponInput("");
                  }}
                >
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.currentTarget.value)}
                      placeholder={t("couponPlaceholder")}
                      aria-label={t("couponPlaceholder")}
                      aria-invalid={couponError}
                      className="h-11 min-w-0 flex-1 rounded-xs border border-hairline-strong bg-surface px-3 text-sm uppercase placeholder:normal-case placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="h-11 shrink-0 rounded-xs border border-ink-900 px-4 text-sm text-ink-900 transition-colors hover:bg-ink-900 hover:text-sand-50"
                    >
                      {t("couponApply")}
                    </button>
                  </div>
                  {couponError && (
                    <p className="mt-1.5 text-2xs text-brick-600">{t("couponInvalid")}</p>
                  )}
                </form>
              )}

              <CartTotalsBlock cart={cart} />

              <button
                type="button"
                onClick={onCheckout}
                className="flex h-13 w-full items-center justify-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50 transition-colors hover:bg-palm-700"
              >
                {t("checkout")}
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full text-center text-xs text-ink-500 underline underline-offset-4"
              >
                {t("continueShopping")}
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
