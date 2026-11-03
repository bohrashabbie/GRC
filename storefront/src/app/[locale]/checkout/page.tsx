import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";


import { currentCustomer } from "@/app/actions";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { getCities, getPaymentMethods, getRegions, getShippingMethods } from "@/lib/shop-api";
import type { Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const typedLocale = locale as Locale;

  // Guests may check out: their order belongs to the email they give. A
  // signed-in shopper's email is already known, so they are not asked again.
  const customer = await currentCustomer(typedLocale);

  const [t, regions, cities, shippingMethods, paymentMethods] = await Promise.all([
    getTranslations("checkout"),
    getRegions(typedLocale),
    getCities(typedLocale),
    getShippingMethods(typedLocale),
    getPaymentMethods(typedLocale),
  ]);

  return (
    <div className="container-site py-10 lg:py-14">
      <h1 className="mb-10 font-display text-h1 text-ink-900">{t("title")}</h1>
      <CheckoutFlow
        email={customer?.email ?? ""}
        isGuest={!customer}
        regions={regions}
        cities={cities}
        shippingMethods={shippingMethods}
        paymentMethods={paymentMethods}
        paymentFailed={query.payment === "failed"}
      />
    </div>
  );
}
