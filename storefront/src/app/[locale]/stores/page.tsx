import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StoreList } from "@/components/stores/store-list";
import { getStores } from "@/lib/shop-api";
import { localeAlternates, type Locale } from "@/i18n/routing";

export const revalidate = 3600;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stores" });

  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: `/${locale}/stores`,
      languages: localeAlternates("/stores"),
    },
  };
}

export default async function StoresPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const [t, stores] = await Promise.all([getTranslations("stores"), getStores(typedLocale)]);

  return (
    <div className="container-site py-10 lg:py-14">
      <Breadcrumbs crumbs={[{ label: t("title") }]} />

      <header className="mt-6 mb-10">
        <h1 className="font-display text-h1 text-ink-900">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">{t("intro")}</p>
      </header>

      <StoreList stores={stores} />
    </div>
  );
}
