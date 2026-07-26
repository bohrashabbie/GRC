import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CartPageView } from "@/components/cart/cart-page-view";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CartPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("cart");

  return (
    <div className="container-site py-10 lg:py-14">
      <h1 className="mb-10 font-display text-h1 text-ink-900">{t("title")}</h1>
      <CartPageView />
    </div>
  );
}
