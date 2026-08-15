import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getBrands } from "@/lib/shop-api";
import { localeAlternates, type Locale } from "@/i18n/routing";

/**
 * The brand index.
 *
 * The API only returns brands that actually carry a product, so every tile
 * here leads somewhere with stock in it — an empty brand would otherwise send
 * shoppers to a listing with nothing on it.
 */

export const revalidate = 600;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brands" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: `/${locale}/brands`,
      languages: localeAlternates("/brands"),
    },
  };
}

export default async function BrandsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const [t, brands] = await Promise.all([
    getTranslations("brands"),
    getBrands(typedLocale),
  ]);

  return (
    <div className="container-site py-8 lg:py-12">
      <Breadcrumbs crumbs={[{ label: t("title") }]} />

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink-900 lg:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-ink-500">{t("intro")}</p>
      </header>

      {brands.length === 0 ? (
        <p className="mt-10 text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={brand.href}
                className="flex h-full flex-col gap-2 rounded-lg border border-sand-200 p-5 transition-colors hover:border-gold-300 hover:bg-sand-50"
              >
                <span className="text-base font-semibold text-ink-900">
                  {brand.name}
                </span>
                {brand.description && (
                  <span className="line-clamp-2 text-xs text-ink-500">
                    {brand.description}
                  </span>
                )}
                <span className="mt-auto pt-2 text-2xs text-ink-400">
                  {t("productCount", { count: brand.product_count })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
