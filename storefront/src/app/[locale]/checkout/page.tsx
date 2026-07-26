import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { getCities, getPaymentMethods, getRegions, getShippingMethods } from "@/lib/shop-api";
import type { Locale } from "@/i18n/routing";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
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
        regions={regions}
        cities={cities}
        shippingMethods={shippingMethods}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}
