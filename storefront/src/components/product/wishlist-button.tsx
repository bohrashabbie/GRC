"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * NOT YET PERSISTED. The `wishlists` / `wishlist_items` tables do not exist,
 * so this holds local state only and forgets on navigation. The design is
 * final; wiring it to `POST /shop/v1/wishlist` is group 6 work and should
 * replace `useState` with a TanStack Query mutation without touching markup.
 */
export function WishlistButton({ className }: { className?: string }) {
  const t = useTranslations("header");
  const [isSaved, setIsSaved] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setIsSaved((value) => !value)}
      aria-label={t("wishlist")}
      aria-pressed={isSaved}
      className={cn(
        "inline-flex size-9 items-center justify-center bg-sand-50/85 backdrop-blur-sm transition-colors",
        isSaved ? "text-brick-600" : "text-ink-500 hover:text-ink-900",
        className,
      )}
    >
      <HeartIcon filled={isSaved} className="size-4.5" />
    </button>
  );
}
