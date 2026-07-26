import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ListingView } from "@/components/plp/listing-view";
import { getProductList } from "@/lib/shop-api";
import { parseListQuery, type RawSearchParams } from "@/lib/plp-query";
import type { Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "header" });

  // Search results are per-query and thin — never worth indexing.
  return { title: t("search"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const [t, rawParams] = await Promise.all([getTranslations("plp"), searchParams]);

  const query = parseListQuery(rawParams);
  const data = await getProductList(query, typedLocale);
  const term = query.q ?? "";

  return (
    <ListingView
      title={t("searchResults", { query: term })}
      crumbs={[{ label: t("searchResults", { query: term }) }]}
      data={data}
      query={query}
      locale={typedLocale}
      emptyMessage={t("searchEmpty", { query: term })}
    />
  );
}
