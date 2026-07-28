import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getCategoryTree } from "@/lib/shop-api";
import { localeAlternates, type Locale } from "@/i18n/routing";

export const revalidate = 3600;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "header" });

  return {
    title: t("allCategories"),
    alternates: { canonical: `/${locale}/c`, languages: localeAlternates("/c") },
  };
}

/** Landing target for the mobile bottom nav's "Shop" tab. */
export default async function CategoryIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const [t, categories] = await Promise.all([
    getTranslations("header"),
    getCategoryTree(typedLocale),
  ]);

  return (
    <div className="container-site py-10 lg:py-14">
      <Breadcrumbs crumbs={[{ label: t("allCategories") }]} />

      <h1 className="mt-6 mb-10 font-display text-h1 text-ink-900">{t("allCategories")}</h1>

      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <section key={category.slug}>
            <Link href={`/c/${category.slug}`} className="group block">
              <span className="block overflow-hidden bg-sand-100">
                {category.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.image.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    // A 4:3 window onto a 2:3 portrait cuts even harder than the
                    // circular tiles do, so the same upper-third focal point
                    // applies — a centred crop lands on torsos.
                    className="aspect-[4/3] w-full object-cover object-[50%_22%] transition-transform duration-500 ease-out-soft group-hover:scale-105"
                  />
                )}
              </span>
              <h2 className="mt-4 flex items-baseline justify-between gap-3 font-display text-h3 text-ink-900">
                {category.name}
                <span className="tabular text-2xs font-normal text-ink-400">
                  {category.product_count}
                </span>
              </h2>
            </Link>

            {category.children.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {category.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/c/${child.slug}`}
                      className="flex items-baseline justify-between gap-3 text-sm text-ink-600 transition-colors hover:text-ink-900"
                    >
                      {child.name}
                      <span className="tabular text-2xs text-ink-400">
                        {child.product_count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
