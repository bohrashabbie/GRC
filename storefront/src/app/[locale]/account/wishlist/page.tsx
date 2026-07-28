import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { currentCustomer, loadWishlist } from "@/app/actions";
import { Link } from "@/i18n/navigation";
import { ProductGrid } from "@/components/product/product-rail";
import { getProductList } from "@/lib/shop-api";
import type { Locale } from "@/i18n/routing";
import type { ProductCard } from "@/types/shop";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("wishlist"), robots: { index: false, follow: false } };
}

export default async function WishlistPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const [t, tCart, customer, savedIds] = await Promise.all([
    getTranslations("account"),
    getTranslations("cart"),
    currentCustomer(typedLocale),
    loadWishlist(typedLocale),
  ]);

  if (!customer) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-ink-500">{t("loginForWishlist")}</p>
        <Link
          href="/account/login"
          className="mt-5 inline-flex h-11 items-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  // This page used to render `getCollection("best_sellers")` as a placeholder,
  // which is why the header's heart appeared to "redirect to best sellers".
  // There is no products-by-id endpoint and adding one for a page that shows a
  // handful of cards is not worth the surface, so the catalogue listing — which
  // is already fetched and cached for the browse pages — is filtered instead.
  const saved = new Set(savedIds);
  let products: ProductCard[] = [];
  if (saved.size > 0) {
    const listing = await getProductList({ cursor: null }, typedLocale);
    products = listing.items.filter((product) => saved.has(product.id));
  }

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-ink-500">{t("wishlistEmpty")}</p>
        <Link
          href="/c"
          className="mt-5 inline-flex h-11 items-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50"
        >
          {tCart("emptyAction")}
        </Link>
      </div>
    );
  }

  return <ProductGrid products={products} />;
}
