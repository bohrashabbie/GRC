"use client";

import { useFormatPrice } from "@/components/currency/currency-provider";
import { discountPercent, type Money } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Renders a price pair in the visitor's chosen currency. Both figures come
 * from the API in KWD; the only thing derived here is the discount percentage,
 * which is a label rather than a number any total depends on.
 */
export function Price({
  price,
  compareAtPrice,
  size = "md",
  className,
}: {
  price: Money;
  compareAtPrice?: Money | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const formatPrice = useFormatPrice();
  const percent = compareAtPrice ? discountPercent(price, compareAtPrice) : null;
  const isOnSale = percent !== null;

  const sizes = {
    sm: { now: "text-sm", was: "text-2xs" },
    md: { now: "text-base", was: "text-xs" },
    lg: { now: "text-xl", was: "text-sm" },
  }[size];

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn("tabular font-semibold", sizes.now, isOnSale ? "text-brick-600" : "text-ink-900")}
      >
        {formatPrice(price)}
      </span>

      {compareAtPrice && isOnSale && (
        <span className={cn("tabular text-ink-400 line-through", sizes.was)}>
          {formatPrice(compareAtPrice)}
        </span>
      )}
    </div>
  );
}
