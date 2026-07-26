import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductDetailView } from "@/components/pdp/product-detail-view";
import { ReviewsList } from "@/components/pdp/reviews-section";
import { ProductRail } from "@/components/product/product-rail";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SectionHeading } from "@/components/ui/section-heading";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo";
import { getProduct, getRelatedProducts, getReviews } from "@/lib/shop-api";
import { localeAlternates, type Locale } from "@/i18n/routing";

export const revalidate = 300;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug, locale as Locale);
  if (!product) return {};

  const description = product.description_html.replace(/<[^>]+>/g, "").slice(0, 160);

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/${locale}/p/${slug}`,
      languages: localeAlternates(`/p/${slug}`),
    },
    openGraph: {
      title: product.name,
      description,
      images: product.media[0] ? [product.media[0].url] : undefined,
      type: "website",
    },
  };
}

/**
 * Reviews are secondary content — they stream in their own Suspense boundary
 * so a slow reviews query can never hold up the buy panel, which is the whole
 * point of the page.
 */
async function Reviews({ slug, locale }: { slug: string; locale: Locale }) {
  const [t, data] = await Promise.all([getTranslations("reviews"), getReviews(slug, locale)]);

  return (
    <section id="reviews" className="section-y border-t border-hairline">
      <div className="container-site">
        <SectionHeading title={t("title")} className="mb-8" />
        <ReviewsList
          slug={slug}
          initialReviews={data.items}
          initialCursor={data.next_cursor}
          summary={data.summary}
        />
      </div>
    </section>
  );
}

async function Related({ slug, locale }: { slug: string; locale: Locale }) {
  const [t, products] = await Promise.all([
    getTranslations("pdp"),
    getRelatedProducts(slug, locale),
  ]);

  if (products.length === 0) return null;

  return (
    <section className="section-y border-t border-hairline">
      <div className="container-site">
        <SectionHeading title={t("relatedTitle")} className="mb-8" />
        <ProductRail products={products} />
      </div>
    </section>
  );
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const product = await getProduct(slug, typedLocale);
  if (!product) notFound();

  const crumbs = [
    ...product.breadcrumbs.map((crumb) => ({ href: `/c/${crumb.slug}`, label: crumb.name })),
    { label: product.name },
  ];

  return (
    <>
      <JsonLd data={productJsonLd(product, locale)} />
      <JsonLd data={breadcrumbJsonLd(crumbs, locale)} />

      <div className="container-site py-8 lg:py-12">
        <Breadcrumbs crumbs={crumbs} />
        <div className="mt-8">
          <ProductDetailView product={product} />
        </div>
      </div>

      <Suspense fallback={null}>
        <Related slug={slug} locale={typedLocale} />
      </Suspense>

      <Suspense fallback={null}>
        <Reviews slug={slug} locale={typedLocale} />
      </Suspense>
    </>
  );
}
