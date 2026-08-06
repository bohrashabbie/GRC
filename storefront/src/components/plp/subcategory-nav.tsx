import { Link } from "@/i18n/navigation";
import type { CategoryNode } from "@/types/shop";

/**
 * Child-category rail under a parent category's title — the drill-down step
 * between the department tiles on the home page and the filtered grid. Chips
 * rather than full tiles: on a listing page the products are the subject and
 * the rail is wayfinding, so it has to stay one row tall.
 */
export function SubcategoryNav({ categories }: { categories: CategoryNode[] }) {
  return (
    <ul className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {categories.map((category) => (
        <li key={category.slug} className="shrink-0">
          <Link
            href={`/c/${category.slug}`}
            className="group flex items-center gap-2.5 rounded-full border border-hairline-strong py-1.5 pe-4 ps-1.5 transition-colors hover:border-gold-500"
          >
            {category.image ? (
              // Same upper-third focal point as the home tiles — see the crop
              // note in category-tiles.tsx.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={category.image.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-8 rounded-full object-cover object-[50%_22%]"
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-sand-100 font-display text-sm text-ink-400">
                {category.name.trim().charAt(0)}
              </span>
            )}
            <span className="text-sm text-ink-700 transition-colors group-hover:text-ink-900">
              {category.name}
            </span>
            <span className="tabular text-2xs text-ink-400">{category.product_count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
