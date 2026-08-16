import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { BrandSummary } from "@/types/shop";

/**
 * The brand showcase on the home page.
 *
 * Centred rather than grid-aligned, because the store carries very few brands:
 * a four-column grid left one card stranded against three empty columns, which
 * reads as a layout that failed to load rather than a short list. Centring makes
 * one card look as deliberate as eight, and the row still fills left-to-right
 * once more brands are added.
 *
 * A monogram plaque rather than a logo tile: no brand carries a logo asset yet,
 * and an empty image box reads as broken where a letterform reads as a mark. The
 * same fallback the category tiles use for artwork-less departments.
 */
export async function BrandStrip({ brands }: { brands: BrandSummary[] }) {
  if (brands.length === 0) return null;
  const t = await getTranslations("home");

  return (
    <ul className="flex flex-wrap justify-center gap-4 sm:gap-5">
      {brands.map((brand) => (
        <li key={brand.id} className="w-full max-w-[15rem] sm:w-56">
          <Link
            href={`/brands/${brand.slug}`}
            className="group flex h-full flex-col items-center gap-3 rounded-xl bg-white px-6 py-8 text-center ring-1 ring-inset ring-hairline-strong transition-[box-shadow,transform] duration-300 ease-out-soft hover:-translate-y-0.5 hover:ring-2 hover:ring-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-full bg-sand-100 font-display text-xl text-ink-500 transition-colors group-hover:text-gold-600"
            >
              {brand.name.trim().charAt(0)}
            </span>

            <span className="font-display text-base leading-tight text-ink-900">
              {brand.name}
            </span>

            {/* Labelled, not a bare numeral — "2" alone under a brand name reads
                as a rank or a rating rather than a stock count. */}
            <span className="text-2xs uppercase tracking-wide text-ink-500">
              {t("brandProductCount", { count: brand.product_count })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
