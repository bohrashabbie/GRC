"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { AddressForm, validateAddress, type AddressFormErrors } from "./address-form";
import { submitOrder } from "@/app/actions";
import { useCart } from "@/components/cart/cart-provider";
import { CartTotalsBlock } from "@/components/cart/cart-totals";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/format";
import type {
  AddressInput,
  City,
  PaymentMethod,
  PaymentMethodCode,
  Region,
  ShippingMethod,
} from "@/types/shop";
import { cn } from "@/lib/utils";

type Step = "contact" | "address" | "shipping" | "payment";

const STEPS: Step[] = ["contact", "address", "shipping", "payment"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Four-step checkout on one page — each step collapses to a summary line once
 * completed, so the shopper can always see how far along they are without a
 * multi-page flow that loses state on a back button.
 */
export function CheckoutFlow({
  regions,
  cities,
  shippingMethods,
  paymentMethods,
}: {
  regions: Region[];
  cities: City[];
  shippingMethods: ShippingMethod[];
  paymentMethods: PaymentMethod[];
}) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { cart, setShippingPrice, clear } = useCart();

  const [step, setStep] = useState<Step>("contact");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [address, setAddress] = useState<Partial<AddressInput>>({});
  const [addressErrors, setAddressErrors] = useState<AddressFormErrors>({});
  const [shippingId, setShippingId] = useState(shippingMethods[0]?.id ?? "");
  const [paymentCode, setPaymentCode] = useState(paymentMethods[0]?.code ?? "mada");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  // Someone else took the last one while this shopper was typing. Not a
  // payment failure, and it needs its own wording plus a route back to the
  // cart to fix the quantity.
  const [stockProblem, setStockProblem] = useState<{
    name: string;
    available: number;
  } | null>(null);

  const selectedShipping = shippingMethods.find((method) => method.id === shippingId);

  // Selecting a shipping method changes what the server charges, so the cart
  // is rebuilt rather than adjusted locally.
  useEffect(() => {
    void setShippingPrice(selectedShipping?.price ?? null);
  }, [selectedShipping?.price, setShippingPrice]);

  const isEmpty = !cart || cart.lines.length === 0;

  if (isEmpty) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-h2 text-ink-900">{tCart("empty")}</p>
        <Link
          href="/c/thobes"
          className="mt-6 inline-flex h-12 items-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50"
        >
          {tCart("emptyAction")}
        </Link>
      </div>
    );
  }

  function completeContact() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError(t("invalidEmail"));
      return;
    }
    setEmailError(undefined);
    setStep("address");
  }

  function completeAddress() {
    const errors = validateAddress(address, {
      required: t("required"),
      invalidPhone: t("invalidPhone"),
    });
    setAddressErrors(errors);
    if (Object.keys(errors).length === 0) setStep("shipping");
  }

  /**
   * Creates the real order. There is still no payment gateway, so nothing is
   * charged — but the order and its stock decrement are real, and they happen
   * together in one server transaction.
   *
   * Stock is re-checked server-side at this point on purpose: the quantity the
   * product page showed could be many minutes old by now, and the quantity
   * this browser sends is never trusted.
   */
  async function placeOrder() {
    if (!cart) return;
    setIsPaying(true);
    setPaymentFailed(false);
    setStockProblem(null);

    const result = await submitOrder(
      {
        lines: cart.lines.map((line) => ({
          variant_id: Number(line.variant_id),
          quantity: line.quantity,
        })),
        email: email.trim(),
        // Slugs, not names: the server resolves the labels so an order can
        // never be snapshotted with a governorate name that disagrees with the
        // code the shopper picked.
        shipping_address: {
          full_name: address.full_name ?? "",
          phone: address.phone ?? "",
          governorate_id: address.governorate_id ?? "",
          area_id: address.area_id ?? "",
          block: address.block ?? "",
          street: address.street ?? "",
          building: address.building ?? "",
          extra_directions: address.extra_directions ?? null,
        },
        shipping_method_id: shippingId,
        payment_method_code: paymentCode as PaymentMethodCode,
      },
      locale,
    );

    setIsPaying(false);

    if (!result.ok) {
      if (result.reason === "insufficient_stock") {
        setStockProblem({
          name: result.detail?.variant_name ?? "",
          available: result.detail?.available ?? 0,
        });
      } else {
        setPaymentFailed(true);
      }
      return;
    }

    await clear();
    router.push(
      `/checkout/confirmation?order=${result.order.order_number}&email=${encodeURIComponent(email)}`,
    );
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
      <div className="space-y-4">
        {STEPS.map((current, index) => {
          const isActive = step === current;
          const isDone = index < stepIndex;

          return (
            <section
              key={current}
              className={cn(
                "border transition-colors",
                isActive ? "border-ink-900 bg-surface" : "border-hairline bg-transparent",
              )}
            >
              <header className="flex items-center justify-between gap-4 px-5 py-4">
                <h2 className="flex items-center gap-3 text-sm font-medium text-ink-900">
                  <span
                    className={cn(
                      "tabular inline-flex size-6 shrink-0 items-center justify-center rounded-full text-2xs",
                      isActive || isDone
                        ? "bg-palm-600 text-sand-50"
                        : "bg-sand-200 text-ink-500",
                    )}
                  >
                    {index + 1}
                  </span>
                  {t(
                    current === "contact"
                      ? "stepContact"
                      : current === "address"
                        ? "stepAddress"
                        : current === "shipping"
                          ? "stepShipping"
                          : "stepPayment",
                  )}
                </h2>

                {isDone && (
                  <button
                    type="button"
                    onClick={() => setStep(current)}
                    className="text-xs text-gold-700 underline underline-offset-4"
                  >
                    {t("editStep")}
                  </button>
                )}
              </header>

              {isActive && (
                <div className="border-t border-hairline px-5 py-6">
                  {current === "contact" && (
                    <div className="space-y-5">
                      <p className="text-sm text-ink-500">{t("guestOrLogin")}</p>
                      <TextField
                        label={t("email")}
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.currentTarget.value)}
                        error={emailError}
                        autoComplete="email"
                        dir="ltr"
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={completeContact}>{t("continueAsGuest")}</Button>
                        <Link
                          href="/account/login"
                          className="inline-flex h-11 items-center px-2 text-sm text-ink-700 underline underline-offset-4"
                        >
                          {t("signIn")}
                        </Link>
                      </div>
                    </div>
                  )}

                  {current === "address" && (
                    <div className="space-y-6">
                      <AddressForm
                        value={address}
                        onChange={setAddress}
                        errors={addressErrors}
                        regions={regions}
                        cities={cities}
                      />
                      <Button onClick={completeAddress}>{t("continue")}</Button>
                    </div>
                  )}

                  {current === "shipping" && (
                    <div className="space-y-5">
                      <ul className="space-y-3">
                        {shippingMethods.map((method) => (
                          <li key={method.id}>
                            <label
                              className={cn(
                                "flex cursor-pointer items-start gap-3 border p-4 transition-colors",
                                shippingId === method.id
                                  ? "border-ink-900 bg-sand-100"
                                  : "border-hairline-strong hover:border-ink-400",
                              )}
                            >
                              <input
                                type="radio"
                                name="shipping"
                                value={method.id}
                                checked={shippingId === method.id}
                                onChange={() => setShippingId(method.id)}
                                className="mt-0.5 size-4 accent-palm-600"
                              />
                              <span className="flex-1">
                                <span className="flex items-baseline justify-between gap-3">
                                  <span className="text-sm text-ink-900">{method.name}</span>
                                  <span className="tabular text-sm text-ink-900">
                                    {Number(method.price) === 0
                                      ? tCart("shippingFree")
                                      : formatPrice(method.price, locale)}
                                  </span>
                                </span>
                                <span className="mt-1 block text-2xs text-ink-500">
                                  {method.estimated_days
                                    ? method.estimated_days.min === method.estimated_days.max
                                      ? t("estimatedNextDay")
                                      : t("estimatedDays", {
                                          min: method.estimated_days.min,
                                          max: method.estimated_days.max,
                                        })
                                    : t("readyIn")}
                                  {method.description ? ` · ${method.description}` : ""}
                                </span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                      <Button onClick={() => setStep("payment")}>{t("continue")}</Button>
                    </div>
                  )}

                  {current === "payment" && (
                    <div className="space-y-5">
                      <ul className="space-y-3">
                        {paymentMethods
                          .filter((method) => method.is_available)
                          .map((method) => (
                            <li key={method.code}>
                              <label
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 border p-4 transition-colors",
                                  paymentCode === method.code
                                    ? "border-ink-900 bg-sand-100"
                                    : "border-hairline-strong hover:border-ink-400",
                                )}
                              >
                                <input
                                  type="radio"
                                  name="payment"
                                  value={method.code}
                                  checked={paymentCode === method.code}
                                  onChange={() => setPaymentCode(method.code)}
                                  className="size-4 accent-palm-600"
                                />
                                <span className="flex-1">
                                  <span className="text-sm text-ink-900">{method.name}</span>
                                  {method.description && (
                                    <span className="mt-0.5 block text-2xs text-ink-500">
                                      {method.description}
                                    </span>
                                  )}
                                </span>
                              </label>
                            </li>
                          ))}
                      </ul>

                      {paymentFailed && (
                        <div className="border-s-2 border-brick-600 bg-sand-100 px-4 py-3">
                          <p className="text-sm text-brick-600">{t("paymentFailed")}</p>
                        </div>
                      )}

                      {stockProblem && (
                        <div className="border-s-2 border-brick-600 bg-sand-100 px-4 py-3">
                          <p className="text-sm font-medium text-brick-600">
                            {stockProblem.available > 0
                              ? t("stockChanged", {
                                  name: stockProblem.name,
                                  count: stockProblem.available,
                                })
                              : t("stockGone", { name: stockProblem.name })}
                          </p>
                          <Link
                            href="/cart"
                            className="mt-1.5 inline-block text-xs text-gold-700 underline underline-offset-4"
                          >
                            {t("backToCart")}
                          </Link>
                        </div>
                      )}

                      <Button size="lg" onClick={placeOrder} disabled={isPaying} className="w-full">
                        {isPaying ? t("processing") : t("placeOrder")}
                      </Button>

                      {isPaying && (
                        <p className="text-center text-2xs text-ink-400">{t("processingBody")}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-32 lg:self-start">
        <div className="border border-hairline bg-surface p-5">
          <h2 className="font-display text-h3 text-ink-900">{t("orderSummary")}</h2>

          <ul className="mt-5 space-y-4 border-b border-hairline pb-5">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex gap-3">
                <span className="relative w-14 shrink-0 bg-sand-100">
                  {line.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.image.url} alt="" className="aspect-[2/3] w-full object-cover" />
                  )}
                  <span
                    dir="ltr"
                    className="tabular absolute -top-2 -end-2 inline-flex size-5 items-center justify-center rounded-full bg-ink-900 text-[0.625rem] text-sand-50"
                  >
                    {line.quantity}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-ink-800">{line.name}</span>
                  {line.options_label && (
                    <span className="block text-2xs text-ink-400">{line.options_label}</span>
                  )}
                </span>
                <span className="tabular self-center text-xs text-ink-900">
                  {formatPrice(line.line_total, locale)}
                </span>
              </li>
            ))}
          </ul>

          <CartTotalsBlock cart={cart} className="mt-5" />
        </div>

        <Link
          href="/cart"
          className="mt-4 inline-block text-xs text-ink-500 underline underline-offset-4"
        >
          {t("backToCart")}
        </Link>
      </aside>
    </div>
  );
}
