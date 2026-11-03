import type { AddressInput } from "@/types/shop";

/**
 * What the shopper has filled in at checkout, kept while they are away on
 * Hesabe's payment page so a declined card does not mean typing it all again.
 *
 * sessionStorage on purpose: it survives leaving for Hesabe and coming back in
 * the same tab, then disappears when the tab closes, so a delivery address is
 * not left behind on a shared computer the way localStorage would leave it. A
 * cookie would also send it to the server on every request, for no benefit.
 *
 * It is a convenience, so storage being blocked or full must never break the
 * checkout: every access is guarded and simply does nothing on failure.
 */
const STORAGE_KEY = "grc.checkout.v1";

export interface CheckoutDraft {
  /** Whose it is ("guest" for a guest), so a different account in the same
   *  tab never sees it. */
  email: string;
  /** What a guest typed as their email. */
  guestEmail?: string;
  address: Partial<AddressInput>;
  shippingId: string;
  paymentCode: string;
}

export function readCheckoutDraft(email: string): CheckoutDraft | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const draft = raw ? (JSON.parse(raw) as CheckoutDraft) : null;
    return draft?.email === email ? draft : null;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Private mode or full storage: the checkout works without it.
  }
}

export function clearCheckoutDraft(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was stored, then.
  }
}
