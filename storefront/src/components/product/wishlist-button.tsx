"use client";

import { useTranslations } from "next-intl";

import { HeartIcon } from "@/components/ui/icons";
import { useWishlist } from "./wishlist-provider";
import { cn } from "@/lib/utils";

/**
 * The heart on a product card and on the PDP.
 *
 * State lives in WishlistProvider, not here, so every card showing the same
 * product agrees — hearting a thobe in the Best Sellers rail fills its heart in
 * New Arrivals too, without either card knowing about the other.
 *
 * `stopPropagation` matters on a card: the product name carries a stretched
 * link covering the whole tile, and without it the click would both toggle the
 * heart and navigate away from the page you were browsing.
 */
export function WishlistButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const t = useTranslations("header");
  const tAccount = useTranslations("account");
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(productId);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(productId);
      }}
      aria-label={saved ? tAccount("removeFromWishlist") : tAccount("addToWishlist")}
      aria-pressed={saved}
      title={saved ? tAccount("removeFromWishlist") : tAccount("addToWishlist")}
      className={cn(
        "inline-flex size-9 items-center justify-center bg-sand-50/85 backdrop-blur-sm transition-colors",
        saved ? "text-brick-600" : "text-ink-500 hover:text-ink-900",
        className,
      )}
    >
      <HeartIcon filled={saved} className="size-4.5" />
      <span className="sr-only">{t("wishlist")}</span>
    </button>
  );
}
