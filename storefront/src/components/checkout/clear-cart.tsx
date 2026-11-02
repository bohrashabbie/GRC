"use client";

import { useEffect } from "react";

import { useCart } from "@/components/cart/cart-provider";

/**
 * Empties the cart once a shopper is back from Hesabe with an order placed. It
 * cannot happen before they leave: a declined card has to return to a full
 * cart, so this page is the first point that knows the cart is finished with.
 */
export function ClearCart() {
  const { clear } = useCart();

  useEffect(() => {
    void clear();
    // Once per visit; `clear` changes identity as the cart does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
