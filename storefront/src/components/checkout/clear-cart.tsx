"use client";

import { useEffect } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { clearCheckoutDraft } from "@/lib/checkout-draft";

/**
 * Empties the cart and the saved checkout details once a shopper is back from
 * Hesabe with an order placed. It cannot happen before they leave: a declined
 * card has to return to a full cart and a filled-in form, so this page is the
 * first point that knows they are finished with.
 */
export function ClearCart() {
  const { clear } = useCart();

  useEffect(() => {
    clearCheckoutDraft();
    void clear();
    // Once per visit; `clear` changes identity as the cart does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
