import type { Crumb } from "@/components/ui/breadcrumbs";
import type { ProductCard, ProductDetail, ProductVariant, Review } from "@/types/shop";

/**
 * Structured data builders.
 *
 * These live in one module so the shapes stay consistent across pages. All of
 * them take data the page already fetched — nothing here triggers a request.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

const absolute = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export function breadcrumbJsonLd(crumbs: Crumb[], locale: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: absolute(`/${locale}${crumb.href}`) } : {}),
    })),
  };
}

export function itemListJsonLd(products: ProductCard[], locale: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absolute(`/${locale}/p/${product.slug}`),
      name: product.name,
    })),
  };
}

/**
 * Product node with an `AggregateOffer` — the catalogue prices per variant, so
 * a single `Offer` would misrepresent a product whose variants differ in price.
 */
export function productJsonLd(
  product: ProductDetail,
  locale: string,
  reviews: Review[] = [],
): Record<string, unknown> {
  const inStock = product.variants.some((v: ProductVariant) => v.stock_state !== "out_of_stock");

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description_html.replace(/<[^>]+>/g, "").slice(0, 500),
    sku: product.variants[0]?.sku,
    image: product.media.slice(0, 5).map((media) => absolute(media.url)),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "KWD",
      lowPrice: product.price_range.min,
      highPrice: product.price_range.max,
      offerCount: product.variants.length,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: absolute(`/${locale}/p/${product.slug}`),
    },
    aggregateRating: product.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: product.rating.average,
          reviewCount: product.rating.count,
        }
      : undefined,
    review: reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
      author: { "@type": "Person", name: review.author_name },
      datePublished: review.created_at,
      reviewBody: review.body,
    })),
  };
}

export function organizationJsonLd(name: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: SITE_URL,
    logo: absolute("/logo-mark.svg"),
  };
}
