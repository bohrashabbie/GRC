import { Link } from "@/i18n/navigation";
import type { CategoryNode } from "@/types/shop";

/**
 * Circular department tiles — the pattern Saudi shoppers already expect at the
 * top of a category-led store. Scrolls horizontally on mobile rather than
 * wrapping to three cramped rows.
 */
export function CategoryTiles({ categories }: { categories: CategoryNode[] }) {
  return (
    <ul className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-8 md:overflow-visible md:px-0 lg:grid-cols-7">
      {categories.map((category) => (
        <li key={category.slug} className="w-24 shrink-0 snap-start md:w-auto">
          <Link href={`/c/${category.slug}`} className="group flex flex-col items-center gap-3">
            <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-sand-100 ring-1 ring-inset ring-hairline-strong transition-all duration-300 group-hover:ring-2 group-hover:ring-gold-500">
              {category.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.image.url}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
                />
              )}
            </span>
            <span className="text-center text-xs leading-tight text-ink-700 transition-colors group-hover:text-ink-900 md:text-sm">
              {category.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
