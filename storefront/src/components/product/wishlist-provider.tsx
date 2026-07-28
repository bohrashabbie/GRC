"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useLocale } from "next-intl";

import { toggleWishlist } from "@/app/actions";
import { useSession } from "@/components/account/session-provider";
import type { LocaleCode } from "@/types/shop";

/**
 * Which products are hearted, for every card on the page at once.
 *
 * Seeded on the server from the signed-in shopper's wishlist, so a card renders
 * its filled heart in the first paint rather than flashing empty and correcting
 * itself. Every toggle returns the whole list from the server, which is what
 * keeps two open tabs in agreement.
 *
 * Signed-out shoppers get the login prompt instead of a silent no-op. The
 * server enforces that too — the action refuses without a session cookie — so
 * this is convenience, not the boundary.
 */

interface WishlistContextValue {
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => void;
  isPending: boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return context;
}

export function WishlistProvider({
  initialProductIds,
  children,
}: {
  initialProductIds: string[];
  children: React.ReactNode;
}) {
  const locale = useLocale() as LocaleCode;
  const { requireLogin } = useSession();
  const [saved, setSaved] = useState<Set<string>>(() => new Set(initialProductIds));
  const [isPending, startTransition] = useTransition();

  const isSaved = useCallback((productId: string) => saved.has(productId), [saved]);

  const toggle = useCallback(
    (productId: string) => {
      // Ask up front rather than letting the optimistic heart fill and then
      // snap back when the server refuses.
      if (!requireLogin("wishlist")) return;

      const wasSaved = saved.has(productId);

      // Optimistic: hearting should feel instant. The server's answer replaces
      // this a moment later, and a refusal rolls it back.
      setSaved((current) => {
        const next = new Set(current);
        if (wasSaved) next.delete(productId);
        else next.add(productId);
        return next;
      });

      startTransition(async () => {
        const result = await toggleWishlist(productId, wasSaved, locale);
        if (result.ok) {
          setSaved(new Set(result.productIds));
        } else {
          // The cookie expired between page load and this click.
          setSaved((current) => {
            const next = new Set(current);
            if (wasSaved) next.add(productId);
            else next.delete(productId);
            return next;
          });
          requireLogin("wishlist");
        }
      });
    },
    [locale, requireLogin, saved],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({ isSaved, toggle, isPending, count: saved.size }),
    [isSaved, toggle, isPending, saved.size],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
