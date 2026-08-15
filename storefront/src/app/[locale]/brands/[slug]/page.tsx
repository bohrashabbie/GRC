import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ListingView } from "@/components/plp/listing-view";
import { getBrand, getProductList } from "@/lib/shop-api";
import { parseListQuery, type RawSearchParams } from "@/lib/plp-query";
import { localeAlternates, type Locale } from "@/i18n/routing";

/**
 * One brand's products, on the same listing shell as categories and
 * collections — facets, sort and infinite scroll all come for free, because a
 * brand page is just another filter over the same catalogue.
 */

export const revalidate = 300;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const brand = await getBrand(slug, locale as Locale);
  if (!brand) return {};

  return {
    title: brand.name,
    description: brand.description ?? undefined,
    alternates: {
      canonical: `/${locale}/brands/${slug}`,
      languages: localeAlternates(`/brands/${slug}`),
    },
  };
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const brand = await getBrand(slug, typedLocale);
  if (!brand) notFound();

  const resolvedSearchParams = await searchParams;
  // The brand comes from the path, not the query string — it is what the page
  // *is*, so it has to survive every facet change the shopper makes.
  const query = parseListQuery(resolvedSearchParams, undefined, undefined, slug);

  const [t, data] = await Promise.all([
    getTranslations("brands"),
    getProductList(query, typedLocale),
  ]);

  return (
    <ListingView
      title={brand.name}
      intro={brand.description}
      crumbs={[{ label: t("title"), href: "/brands" }, { label: brand.name }]}
      data={data}
      query={query}
      locale={typedLocale}
    />
  );
}
