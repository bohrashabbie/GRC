import { getTranslations, setRequestLocale } from "next-intl/server";

import { HeroSlider } from "@/components/home/hero-slider";
import { CategoryTiles } from "@/components/home/category-tiles";
import { PromoBanner } from "@/components/home/promo-banner";
import { ProductRail } from "@/components/product/product-rail";
import { SectionHeading } from "@/components/ui/section-heading";
import { UspStrip } from "@/components/layout/usp-strip";
import { getBanners, getCategoryTree, getCollection } from "@/lib/shop-api";
import type { Locale } from "@/i18n/routing";

/** Read-heavy and highly cacheable — revalidate rather than render per request. */
export const revalidate = 600;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;

  const [t, tHeader, heroBanners, promoBanners, categories, bestSellers, offers, newArrivals] =
    await Promise.all([
      getTranslations("home"),
      getTranslations("header"),
      getBanners("home_hero", typedLocale),
      getBanners("home_promo", typedLocale),
      getCategoryTree(typedLocale),
      getCollection("best_sellers", typedLocale),
      getCollection("offers", typedLocale),
      getCollection("new_arrivals", typedLocale),
    ]);

  return (
    <>
      <HeroSlider banners={heroBanners} />

      <section className="section-y">
        <div className="container-site">
          <SectionHeading
            title={t("shopByCategory")}
            intro={t("shopByCategoryIntro")}
            className="mb-8"
          />
          <CategoryTiles categories={categories} />
        </div>
      </section>

      <section className="pb-16">
        <div className="container-site">
          <SectionHeading
            title={bestSellers.title}
            intro={bestSellers.subtitle}
            href={bestSellers.href}
            hrefLabel={tHeader("viewAll")}
            className="mb-8"
          />
          <ProductRail products={bestSellers.products} />
        </div>
      </section>

      {promoBanners[0] && <PromoBanner banner={promoBanners[0]} />}

      {offers.products.length > 0 && (
        <section className="section-y">
          <div className="container-site">
            <SectionHeading
              title={offers.title}
              intro={offers.subtitle}
              href={offers.href}
              hrefLabel={tHeader("viewAll")}
              className="mb-8"
            />
            <ProductRail products={offers.products} />
          </div>
        </section>
      )}

      <section className="section-y">
        <div className="container-site">
          <SectionHeading
            title={newArrivals.title}
            intro={newArrivals.subtitle}
            href={newArrivals.href}
            hrefLabel={tHeader("viewAll")}
            className="mb-8"
          />
          <ProductRail products={newArrivals.products} />
        </div>
      </section>

      <UspStrip />
    </>
  );
}
