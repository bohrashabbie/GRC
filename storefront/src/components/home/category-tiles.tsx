import { Link } from "@/i18n/navigation";
import type { CategoryNode } from "@/types/shop";

/**
 * Circular department tiles — the pattern Saudi shoppers already expect at the
 * top of a category-led store. Scrolls horizontally on mobile rather than
 * wrapping to three cramped rows.
 *
 * On cropping: the source photography is portrait full-body (roughly 2:3) and a
 * circle is 1:1, so something is always cut. Centring the crop — the browser
 * default — takes the middle of a standing figure and throws the head away,
 * which is the one part that tells a shopper what the department is. The focal
 * point is pulled to the upper third instead, where faces and necklines sit in
 * this set. `object-top` proper is too far: it clips the garment out entirely
 * and leaves a portrait of a face.
 */
export function CategoryTiles({ categories }: { categories: CategoryNode[] }) {
  return (
    <ul className="-mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-x-6 md:gap-y-8 md:overflow-visible md:px-0 lg:grid-cols-7 lg:gap-x-5">
      {categories.map((category) => (
        <li key={category.slug} className="w-28 shrink-0 snap-start sm:w-32 md:w-auto">
          <Link
            href={`/c/${category.slug}`}
            className="group flex flex-col items-center gap-3.5 outline-none"
          >
            <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-sand-100 ring-1 ring-inset ring-hairline-strong transition-[box-shadow,transform] duration-300 ease-out-soft group-hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-gold-500 group-focus-visible:ring-2 group-focus-visible:ring-gold-500">
              {category.image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={category.image.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover object-[50%_22%] transition-transform duration-500 ease-out-soft group-hover:scale-[1.06]"
                  />
                  {/* A whisper of shading at the foot of the circle. Several of
                      these photos are shot on near-white backgrounds, and
                      without it the tile dissolves into the page, leaving the
                      ring as the only thing holding the shape. */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-ink-900/10 via-transparent to-transparent"
                  />
                </>
              ) : (
                // No artwork yet: a monogram beats an empty grey disc, which
                // reads as a broken image rather than a category awaiting one.
                <span className="flex size-full items-center justify-center font-display text-2xl text-ink-400">
                  {category.name.trim().charAt(0)}
                </span>
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
