"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import type { Customer } from "@/types/shop";

/**
 * Who is signed in, and the one login prompt the storefront shares between
 * wishlist and checkout.
 *
 * Cart is deliberately guest-friendly — adding to cart never gates on an
 * account. The "Checkout" button is what asks, via this same modal (see
 * cart-drawer.tsx / cart-page-view.tsx), so nobody is bounced to a bare
 * sign-in page before they've even seen their cart. The checkout page itself
 * still redirects server-side as a fallback for anyone who lands there
 * directly (bookmark, back button) without going through that button.
 *
 * This is convenience, not security. Every gated action is a Server Action that
 * checks the session cookie itself and refuses without one; hiding the UI just
 * saves the shopper a round trip to be told no.
 */

export type LoginReason = "wishlist" | "checkout";

interface SessionContextValue {
  customer: Customer | null;
  isAuthenticated: boolean;
  /** Opens the prompt. Returns false when signed out, so callers can bail in
   *  one line: `if (!requireLogin("wishlist")) return;` */
  requireLogin: (reason: LoginReason) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}

export function SessionProvider({
  customer,
  children,
}: {
  customer: Customer | null;
  children: React.ReactNode;
}) {
  const [reason, setReason] = useState<LoginReason | null>(null);
  const isAuthenticated = customer !== null;
  const pathname = usePathname();

  // This provider lives in the root layout, which survives client-side
  // navigation — so without this the prompt stayed open on top of the very
  // sign-in page it had just sent the shopper to. Keyed on the path rather
  // than the link's onClick so the back button and any programmatic
  // navigation close it too.
  useEffect(() => {
    setReason(null);
  }, [pathname]);

  const requireLogin = useCallback(
    (next: LoginReason) => {
      if (isAuthenticated) return true;
      setReason(next);
      return false;
    },
    [isAuthenticated],
  );

  const value = useMemo<SessionContextValue>(
    () => ({ customer, isAuthenticated, requireLogin }),
    [customer, isAuthenticated, requireLogin],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      {reason && <LoginPrompt reason={reason} onClose={() => setReason(null)} />}
    </SessionContext.Provider>
  );
}

function LoginPrompt({
  reason,
  onClose,
}: {
  reason: LoginReason;
  onClose: () => void;
}) {
  const t = useTranslations("account");

  // Escape closes it, as any modal should.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const body = reason === "checkout" ? t("loginForCheckout") : t("loginForWishlist");

  // Checkout needs the shopper handed straight back to /checkout once they've
  // signed in — everything else lands on /account, its usual default.
  const authHref = (path: "/account/login" | "/account/register") =>
    reason === "checkout" ? { pathname: path, query: { redirect: "/checkout" } } : path;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("loginRequired")}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
    >
      {/* Clicking the backdrop dismisses, same as the cancel button — a modal
          with a single exit is a trap on a touch screen. */}
      <button
        type="button"
        aria-label={t("notNow")}
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/45 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-sm border border-hairline bg-surface p-6 text-center shadow-xl">
        <h2 className="font-display text-h3 text-ink-900">{t("loginRequired")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href={authHref("/account/login")}
            className="inline-flex h-11 items-center justify-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50 transition-colors hover:bg-palm-700"
          >
            {t("signIn")}
          </Link>
          <Link
            href={authHref("/account/register")}
            className="inline-flex h-11 items-center justify-center rounded-xs border border-ink-900 px-6 text-sm text-ink-900 transition-colors hover:bg-ink-900 hover:text-sand-50"
          >
            {t("register")}
          </Link>
          <Button variant="ghost" onClick={onClose} className="h-10 text-xs text-ink-500">
            {t("notNow")}
          </Button>
        </div>
      </div>
    </div>
  );
}
