"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "next-intl";

import { checkCoupon, checkStock, rebuildCart } from "@/app/actions";
import { useSession } from "@/components/account/session-provider";
import type { Cart, LocaleCode } from "@/types/shop";
import type { StoredLine } from "@/lib/shop-api";

/**
 * Cart state.
 *
 * The browser is the source of truth for *what* is in the cart (variant ids
 * and quantities) and for nothing else. Every price, discount, shipping figure
 * and total is recomputed server-side on each change and handed back whole.
 * That split is deliberate: it is what lets the fixture engine be swapped for
 * the real endpoint without touching a single component.
 */

const STORAGE_KEY = "grc.cart.v1";
const COUPON_KEY = "grc.cart.coupon.v1";

interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  isOpen: boolean;
  couponError: boolean;
  open: () => void;
  close: () => void;
  addItem: (variantId: string, productSlug: string, quantity?: number) => Promise<void>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
  setShippingPrice: (price: string | null) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}

function readStored(): StoredLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredLine[]) : [];
  } catch {
    // Corrupted or unavailable storage should empty the cart, not crash the app.
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale() as LocaleCode;
  const { requireLogin } = useSession();

  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [couponError, setCouponError] = useState(false);

  const stored = useRef<StoredLine[]>([]);
  const coupon = useRef<string | null>(null);
  const shippingPrice = useRef<string | null>(null);

  /**
   * Clamp stored quantities to what is actually available.
   *
   * The number on the product page can be minutes old by the time the cart is
   * opened, so this trims the stored lines before the cart is priced — a line
   * whose variant sold out drops to 0 and is removed. It is a courtesy, not a
   * guarantee: the server re-checks inside the order transaction, which is the
   * only place an oversell is actually prevented.
   */
  const clampToStock = useCallback(async () => {
    const ids = stored.current
      .map((line) => Number(line.variantId))
      .filter((id) => Number.isFinite(id));
    if (ids.length === 0) return false;

    const levels = await checkStock(ids, locale);
    if (levels.length === 0) return false;

    const maxById = new Map(levels.map((level) => [level.variant_id, level.max_quantity]));
    let changed = false;
    const next: StoredLine[] = [];

    for (const line of stored.current) {
      const max = maxById.get(Number(line.variantId));
      if (max === undefined || max === null) {
        next.push(line);
        continue;
      }
      if (max <= 0) {
        changed = true;
        continue;
      }
      if (line.quantity > max) {
        changed = true;
        next.push({ ...line, quantity: max });
      } else {
        next.push(line);
      }
    }

    if (changed) stored.current = next;
    return changed;
  }, [locale]);

  const sync = useCallback(async () => {
    if (await clampToStock()) persist();
    const next = await rebuildCart(stored.current, locale, coupon.current, shippingPrice.current);
    setCart(next);
    setIsLoading(false);
  }, [clampToStock, locale]);

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.current));
      if (coupon.current) window.localStorage.setItem(COUPON_KEY, coupon.current);
      else window.localStorage.removeItem(COUPON_KEY);
    } catch {
      // Private browsing can refuse writes; the in-memory cart still works.
    }
  }

  // Hydrate once on mount, then re-sync whenever the locale changes so line
  // names and option labels come back in the language being read.
  useEffect(() => {
    stored.current = readStored();
    try {
      coupon.current = window.localStorage.getItem(COUPON_KEY);
    } catch {
      coupon.current = null;
    }
    void sync();
  }, [sync]);

  const addItem = useCallback(
    async (variantId: string, productSlug: string, quantity = 1) => {
      // Shopping requires an account. Prompting here rather than at checkout
      // means nobody fills a basket only to be stopped at the till.
      if (!requireLogin("cart")) return;

      const existing = stored.current.find((line) => line.variantId === variantId);
      if (existing) existing.quantity += quantity;
      else stored.current = [...stored.current, { variantId, productSlug, quantity }];

      persist();
      setIsOpen(true);
      await sync();
    },
    [requireLogin, sync],
  );

  const setQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      if (quantity <= 0) {
        stored.current = stored.current.filter((line) => line.variantId !== variantId);
      } else {
        stored.current = stored.current.map((line) =>
          line.variantId === variantId ? { ...line, quantity } : line,
        );
      }
      persist();
      await sync();
    },
    [sync],
  );

  const removeItem = useCallback(
    async (variantId: string) => {
      stored.current = stored.current.filter((line) => line.variantId !== variantId);
      persist();
      await sync();
    },
    [sync],
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      const isValid = await checkCoupon(code, locale);
      setCouponError(!isValid);
      if (!isValid) return false;

      coupon.current = code.trim().toUpperCase();
      persist();
      await sync();
      return true;
    },
    [locale, sync],
  );

  const removeCoupon = useCallback(async () => {
    coupon.current = null;
    setCouponError(false);
    persist();
    await sync();
  }, [sync]);

  const setShippingPrice = useCallback(
    async (price: string | null) => {
      shippingPrice.current = price;
      await sync();
    },
    [sync],
  );

  const clear = useCallback(async () => {
    stored.current = [];
    coupon.current = null;
    shippingPrice.current = null;
    persist();
    await sync();
  }, [sync]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading,
      isOpen,
      couponError,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      addItem,
      setQuantity,
      removeItem,
      applyCoupon,
      removeCoupon,
      setShippingPrice,
      clear,
    }),
    [
      cart,
      isLoading,
      isOpen,
      couponError,
      addItem,
      setQuantity,
      removeItem,
      applyCoupon,
      removeCoupon,
      setShippingPrice,
      clear,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
