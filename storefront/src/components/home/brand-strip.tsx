import { Link } from "@/i18n/navigation";
import type { BrandSummary } from "@/types/shop";

/**
 * The brand showcase on the home page.
 *
 * Word marks rather than logo tiles: brands here carry no logo asset, and an
 * empty image box reads as a broken image where a name reads as a name. If
 * logos land later this becomes an image grid without moving anything else.
 */
export function BrandStrip({ brands }: { brands: BrandSummary[] }) {
  if (brands.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {brands.map((brand) => (
        <li key={brand.id}>
          <Link
            href={`/brands/${brand.slug}`}
            className="group flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-hairline bg-white px-4 py-7 text-center transition-colors hover:border-gold-300"
          >
            <span className="text-sm font-medium text-ink-900 transition-colors group-hover:text-gold-600">
              {brand.name}
            </span>
            <span className="text-2xs text-ink-500">
              {brand.product_count}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
