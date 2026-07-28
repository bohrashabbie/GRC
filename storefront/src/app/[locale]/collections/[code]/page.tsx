import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ListingView } from "@/components/plp/listing-view";
import { getCollection, getProductList } from "@/lib/shop-api";
import { parseListQuery, type RawSearchParams } from "@/lib/plp-query";
import { localeAlternates, type Locale } from "@/i18n/routing";

/**
 * The "view all" target behind every home page rail.
 *
 * It reuses the category listing's whole shell — facets, sort, infinite scroll
 * — because a collection is just another filter over the same catalogue. What
 * it is *not* is the category index: sending "view all best sellers" there was
 * the bug this page exists to fix.
 */

export const revalidate = 300;

const COLLECTIONS = ["best_sellers", "new_arrivals", "offers", "featured"] as const;

type PageProps = {
  params: Promise<{ locale: string; code: string }>;
  searchParams: Promise<RawSearchParams>;
};

export function generateStaticParams() {
  return COLLECTIONS.map((code) => ({ code }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, code } = await params;
  if (!COLLECTIONS.includes(code as (typeof COLLECTIONS)[number])) return {};

  const collection = await getCollection(code, locale as Locale);
  return {
    title: collection.title,
    description: collection.subtitle ?? undefined,
    alternates: {
      canonical: `/${locale}/collections/${code}`,
      languages: localeAlternates(`/collections/${code}`),
    },
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  if (!COLLECTIONS.includes(code as (typeof COLLECTIONS)[number])) notFound();

  const typedLocale = locale as Locale;
  const resolvedSearchParams = await searchParams;
  // The collection comes from the path, not the query string — it is what the
  // page *is*, so it must survive every facet change the shopper makes.
  const query = parseListQuery(resolvedSearchParams, undefined, code);

  const [t, collection, data] = await Promise.all([
    getTranslations("header"),
    getCollection(code, typedLocale),
    getProductList(query, typedLocale),
  ]);

  return (
    <ListingView
      title={collection.title}
      intro={collection.subtitle}
      crumbs={[{ label: t("allCategories"), href: "/c" }, { label: collection.title }]}
      data={data}
      query={query}
      locale={typedLocale}
    />
  );
}
