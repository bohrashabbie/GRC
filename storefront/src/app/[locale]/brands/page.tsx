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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
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
        // Centred, not grid-aligned: the store carries very few brands, and a
        // three-column grid left a single card stranded against two empty
        // columns, reading as a layout that failed rather than a short list.
        <ul className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-5">
          {brands.map((brand) => (
            <li key={brand.id} className="w-full max-w-[17rem] sm:w-64">
              <Link
                href={brand.href}
                className="group flex h-full flex-col items-center gap-3 rounded-xl bg-white px-6 py-8 text-center ring-1 ring-inset ring-hairline-strong transition-[box-shadow,transform] duration-300 ease-out-soft hover:-translate-y-0.5 hover:ring-2 hover:ring-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500"
              >
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center rounded-full bg-sand-100 font-display text-xl text-ink-500 transition-colors group-hover:text-gold-600"
                >
                  {brand.name.trim().charAt(0)}
                </span>
                <span className="font-display text-base leading-tight text-ink-900">
                  {brand.name}
                </span>
                {brand.description && (
                  <span className="line-clamp-2 text-xs text-ink-500">
                    {brand.description}
                  </span>
                )}
                <span className="text-2xs uppercase tracking-wide text-ink-500">
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
