import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { ListingView } from "@/components/plp/listing-view";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";
import { getCategory, getCategoryPath, getProductList } from "@/lib/shop-api";
import { parseListQuery, type RawSearchParams } from "@/lib/plp-query";
import { localeAlternates, type Locale } from "@/i18n/routing";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await getCategory(slug, locale as Locale);
  if (!category) return {};

  return {
    title: category.name,
    description: category.name,
    alternates: {
      canonical: `/${locale}/c/${slug}`,
      languages: localeAlternates(`/c/${slug}`),
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const [category, rawParams] = await Promise.all([
    getCategory(slug, typedLocale),
    searchParams,
  ]);

  if (!category) notFound();

  const query = parseListQuery(rawParams, slug);
  const [data, ancestors] = await Promise.all([
    getProductList(query, typedLocale),
    getCategoryPath(slug, typedLocale),
  ]);

  const crumbs = [
    ...ancestors.map((node) => ({ href: `/c/${node.slug}`, label: node.name })),
    { label: category.name },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs, locale)} />
      <JsonLd data={itemListJsonLd(data.items, locale)} />
      <ListingView
        title={category.name}
        crumbs={crumbs}
        data={data}
        query={query}
        locale={typedLocale}
      />
    </>
  );
}
