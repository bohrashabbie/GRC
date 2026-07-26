import type { MetadataRoute } from "next";

import { getCategoryTree, getPageSlugs, getProductSlugs } from "@/lib/shop-api";
import { locales } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

/**
 * Every indexable URL, in both locales, with `alternates.languages` so Google
 * pairs the Arabic and English versions rather than treating them as
 * duplicates. Cart, checkout and account are omitted — they are `noindex`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, productSlugs, pageSlugs] = await Promise.all([
    getCategoryTree("ar"),
    getProductSlugs(),
    getPageSlugs(),
  ]);

  const categorySlugs = tree.flatMap((node) => [
    node.slug,
    ...node.children.map((child) => child.slug),
  ]);

  const paths = [
    "",
    "/c",
    "/stores",
    ...categorySlugs.map((slug) => `/c/${slug}`),
    ...productSlugs.map((slug) => `/p/${slug}`),
    ...pageSlugs.map((slug) => `/pages/${slug}`),
  ];

  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path.startsWith("/p/") ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : path.startsWith("/p/") ? 0.8 : 0.6,
      alternates: {
        languages: Object.fromEntries(
          locales.map((alt) => [alt, `${SITE_URL}/${alt}${path}`]),
        ),
      },
    })),
  );
}
