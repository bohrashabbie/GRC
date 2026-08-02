import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ContactForm } from "@/components/contact/contact-form";
import { getPage } from "@/lib/shop-api";
import { formatDate } from "@/lib/format";
import { localeAlternates, type Locale } from "@/i18n/routing";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

// Prerendering (generateStaticParams + a page-level `revalidate`) was removed
// here: CATALOG_REVALIDATE_SECONDS=0 forces every shopFetch call to use
// `cache: "no-store"` so admin edits show up immediately (see compose.yml),
// which is incompatible with a statically-generated page and threw
// DYNAMIC_SERVER_USAGE for every locale/slug. Reintroduce both once catalogue
// caching is turned back on — and fix getPageSlugs()/generateStaticParams to
// fetch each locale's own slugs instead of pairing every locale with the
// Arabic list.

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

        {/* The seeded contact_us page carries template "contact" — its CMS
            body is the intro copy and this form is the actual channel. */}
        {page.template === "contact" && (
          <div className="mt-10 max-w-2xl border-t border-hairline pt-10">
            <ContactForm />
          </div>
        )}
      </article>
    </div>
  );
}
