import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ProductGrid } from "@/components/product/product-rail";
import { getCollection } from "@/lib/shop-api";
import type { Locale } from "@/i18n/routing";

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
  const [t, tCart, collection] = await Promise.all([
    getTranslations("account"),
    getTranslations("cart"),
    // Standing in for `GET /shop/v1/account/wishlist`, which has no table yet.
    // The wishlist heart on a card is likewise local-only — see
    // `components/product/wishlist-button.tsx`.
    getCollection("best_sellers", typedLocale),
  ]);

  const products = collection.products.slice(0, 3);

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-ink-500">{t("wishlistEmpty")}</p>
        <Link
          href="/c/thobes"
          className="mt-5 inline-flex h-11 items-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50"
        >
          {tCart("emptyAction")}
        </Link>
      </div>
    );
  }

  return <ProductGrid products={products} />;
}
