import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getPage, getPageSlugs } from "@/lib/shop-api";
import { formatDate } from "@/lib/format";
import { localeAlternates, locales, type Locale } from "@/i18n/routing";

export const revalidate = 3600;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

/**
 * Static pages change rarely and are linked from the footer of every page, so
 * they are worth prerendering rather than rendering on demand.
 */
export async function generateStaticParams() {
  const slugs = await getPageSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getPage(slug, locale as Locale);
  if (!page) return {};

  return {
    title: page.title,
    description: page.seo.description,
    alternates: {
      canonical: `/${locale}/pages/${slug}`,
      languages: localeAlternates(`/pages/${slug}`),
    },
  };
}

export default async function StaticPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const page = await getPage(slug, typedLocale);
  if (!page) notFound();

  const t = await getTranslations("common");

  return (
    <div className="container-site py-10 lg:py-16">
      <Breadcrumbs crumbs={[{ label: page.title }]} />

      <article className="mt-6">
        <h1 className="font-display text-h1 text-ink-900">{page.title}</h1>
        <p className="mt-2 text-2xs text-ink-400">
          {t("updatedOn", { date: formatDate(page.updated_at, typedLocale) })}
        </p>

        <div
          className="prose-storefront mt-8"
          // Server-authored CMS copy, not user input.
          dangerouslySetInnerHTML={{ __html: page.body_html }}
        />
      </article>
    </div>
  );
}
