import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Price } from "./price";
import { WishlistButton } from "./wishlist-button";
import { discountPercent } from "@/lib/format";
import type { ProductCard as ProductCardData } from "@/types/shop";
import { cn } from "@/lib/utils";

/**
 * The most-repeated unit in the store, so it earns the detail.
 *
 * The image well is `sand-100` rather than white on purpose: the catalogue is
 * mostly ivory and white garments shot on a pale backdrop, and on a white card
 * the product edge simply disappears.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const t = useTranslations("product");
  const percent = product.compare_at_price
    ? discountPercent(product.price, product.compare_at_price)
    : null;

  const isSoldOut = product.stock_state === "out_of_stock";

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden bg-sand-100">
        <Link href={`/p/${product.slug}`} className="block" tabIndex={-1} aria-hidden="true">
          <div className="aspect-[2/3]">
            {product.primary_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.primary_image.url}
                alt=""
                loading="lazy"
                className={cn(
                  "size-full object-cover transition-opacity duration-300 ease-out-soft",
                  product.hover_image && "group-hover:opacity-0",
                  isSoldOut && "opacity-55",
                )}
              />
            )}

            {/* Second shot revealed on hover. Pure CSS, so the card stays a
                Server Component. */}
            {product.hover_image && !isSoldOut && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.hover_image.url}
                alt=""
                loading="lazy"
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 ease-out-soft group-hover:opacity-100"
              />
            )}
          </div>
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          <ul className="flex flex-col items-start gap-1.5">
            {percent !== null && (
              // `dir="ltr"` isolates the badge: the leading U+2212 is
              // bidi-neutral, so in an RTL paragraph it reorders to the far end
              // and "−22%" renders as "22%−".
              <li
                dir="ltr"
                className="tabular bg-brick-600 px-2 py-1 text-2xs font-semibold text-sand-50"
              >
                {t("discount", { percent })}
              </li>
            )}
            {product.badges.includes("new") && (
              <li className="bg-ink-900 px-2 py-1 text-2xs font-semibold text-sand-50">
                {t("badgeNew")}
              </li>
            )}
            {product.badges.includes("limited") && (
              <li className="border border-gold-500 bg-sand-50/90 px-2 py-1 text-2xs font-semibold text-gold-700">
                {t("badgeLimited")}
              </li>
            )}
            {product.badges.includes("best_seller") && (
              <li className="border border-gold-500 bg-sand-50/90 px-2 py-1 text-2xs font-semibold text-gold-700">
                {t("badgeBestSeller")}
              </li>
            )}
          </ul>

          <WishlistButton className="pointer-events-auto" />
        </div>

        {isSoldOut && (
          <p className="absolute inset-x-0 bottom-0 bg-ink-900/85 py-2 text-center text-2xs font-semibold tracking-wide text-sand-100">
            {t("soldOut")}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 pt-3.5">
        {product.brand && (
          <p className="text-2xs uppercase tracking-widest text-ink-400 rtl:tracking-normal">
            {product.brand.name}
          </p>
        )}

        <h3 className="text-sm leading-snug text-ink-800">
          {/* The whole card is clickable via this stretched link, which keeps
              exactly one focusable link per card for screen readers. */}
          <Link href={`/p/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>

        <Price price={product.price} compareAtPrice={product.compare_at_price} size="sm" />

        {product.colour_swatches.length > 1 && (
          <ul className="mt-1 flex items-center gap-1.5">
            {product.colour_swatches.slice(0, 5).map((swatch) => (
              <li
                key={swatch.option_value_id}
                title={swatch.name}
                style={swatch.hex ? { backgroundColor: swatch.hex } : undefined}
                className="size-3.5 rounded-full ring-1 ring-inset ring-ink-900/15"
              >
                <span className="sr-only">{swatch.name}</span>
              </li>
            ))}
            {product.colour_swatches.length > 5 && (
              <li className="tabular text-2xs text-ink-400">
                +{product.colour_swatches.length - 5}
              </li>
            )}
          </ul>
        )}

        {product.stock_state === "low_stock" && (
          <p className="mt-0.5 text-2xs text-brick-600">{t("lowStock")}</p>
        )}
      </div>
    </article>
  );
}
