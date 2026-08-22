import { getTranslations, setRequestLocale } from "next-intl/server";

import { HeroSlider } from "@/components/home/hero-slider";
import { BrandStrip } from "@/components/home/brand-strip";
import { CategoryTiles } from "@/components/home/category-tiles";
import { ProductRail } from "@/components/product/product-rail";
import { SectionHeading } from "@/components/ui/section-heading";
import { UspStrip } from "@/components/layout/usp-strip";
import { getBanners, getBrands, getCategoryTree, getCollection } from "@/lib/shop-api";
import type { Locale } from "@/i18n/routing";

/** Read-heavy and highly cacheable — revalidate rather than render per request. */
export const revalidate = 600;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;

  const [t, tHeader, heroBanners, categories, brands, bestSellers, offers, newArrivals] =
    await Promise.all([
      getTranslations("home"),
      getTranslations("header"),
      getBanners("home_hero", typedLocale),
      getCategoryTree(typedLocale),
      getBrands(typedLocale),
      getCollection("best_sellers", typedLocale),
      getCollection("offers", typedLocale),
      getCollection("new_arrivals", typedLocale),
    ]);

  // Only the categories staff switched on, and only top-level ones — the row
  // is a short shelf of departments, not the whole tree.
  const homeCategories = categories.filter((category) => category.show_on_home);

  return (
    <>
      <HeroSlider banners={heroBanners} />

      {/* The row is what staff switched on, not simply every category — the
          header menu still shows the whole tree. With none switched on the
          heading goes too, rather than introducing an empty strip. */}
      {homeCategories.length > 0 && (
        <section className="section-y">
          <div className="container-site">
            <SectionHeading
              title={t("shopByCategory")}
              intro={t("shopByCategoryIntro")}
              className="mb-8"
            />
            <CategoryTiles categories={homeCategories} />
          </div>
        </section>
      )}

      {bestSellers.products.length > 0 && (
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
      )}

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

      {newArrivals.products.length > 0 && (
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
      )}

      {/* Hidden entirely when no product carries a brand, rather than rendering
          a heading over an empty row. */}
      {brands.length > 0 && (
        <section className="section-y">
          <div className="container-site">
            <SectionHeading
              title={t("shopByBrand")}
              intro={t("shopByBrandIntro")}
              href="/brands"
              hrefLabel={tHeader("viewAll")}
              className="mb-8"
            />
            <BrandStrip brands={brands} />
          </div>
        </section>
      )}

      <UspStrip />
    </>
  );
}
