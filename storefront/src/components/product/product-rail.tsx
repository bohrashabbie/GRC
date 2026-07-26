import { ProductCard } from "./product-card";
import type { ProductCard as ProductCardData } from "@/types/shop";

/**
 * Horizontal rail on small screens, plain grid from `lg` up.
 *
 * Scroll-snap needs no direction handling — a `flex` row in an RTL document
 * already starts at the right edge and scrolls the correct way natively.
 */
export function ProductRail({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;

  return (
    <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10 lg:overflow-visible lg:px-0">
      {products.map((product) => (
        <li key={product.id} className="w-[58vw] shrink-0 snap-start sm:w-[38vw] lg:w-auto">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

/** Plain responsive grid — PLP, wishlist, search results. */
export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
