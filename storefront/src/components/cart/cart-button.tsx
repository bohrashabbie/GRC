"use client";

import { useTranslations } from "next-intl";

import { useCart } from "./cart-provider";
import { BagIcon } from "@/components/ui/icons";

export function CartButton() {
  const t = useTranslations("header");
  const { cart, open } = useCart();
  const count = cart?.item_count ?? 0;

  return (
    <button
      type="button"
      onClick={open}
      aria-label={t("cartCount", { count })}
      className="relative inline-flex size-10 items-center justify-center text-ink-800 transition-colors hover:text-palm-600"
    >
      <BagIcon className="size-5" />
      {count > 0 && (
        <span
          // `dir="ltr"` so a two-digit count keeps its digits in order in
          // Arabic, and the badge hugs the same corner of the bag in both
          // directions via logical inset.
          dir="ltr"
          className="tabular absolute -top-0.5 end-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-palm-600 px-1 text-[0.625rem] leading-4 text-sand-50"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
