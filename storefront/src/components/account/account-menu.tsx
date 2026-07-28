"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { signOut } from "@/app/actions";
import { useSession } from "./session-provider";
import { useWishlist } from "@/components/product/wishlist-provider";
import { UserIcon } from "@/components/ui/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The header's account control.
 *
 * Signed out it is a plain link to sign in. Signed in it shows the shopper's
 * first name next to the icon and opens a menu — the fastest way to tell at a
 * glance whether a session is live, which a bare icon never conveys.
 */
export function AccountMenu() {
  const t = useTranslations("account");
  const tHeader = useTranslations("header");
  const { customer, isAuthenticated } = useSession();
  const { count } = useWishlist();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape — the two ways anyone expects to
  // dismiss a menu they opened by accident.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isAuthenticated) {
    return (
      <Link
        href="/account/login"
        aria-label={tHeader("account")}
        className="hidden h-10 items-center gap-1.5 px-2 text-sm text-ink-800 transition-colors hover:text-palm-600 sm:inline-flex"
      >
        <UserIcon className="size-5" />
        <span className="hidden lg:inline">{t("signIn")}</span>
      </Link>
    );
  }

  const firstName = customer?.first_name?.trim() || customer?.email?.split("@")[0] || "";

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-10 max-w-40 items-center gap-1.5 px-2 text-sm text-ink-800 transition-colors hover:text-palm-600"
      >
        <UserIcon className="size-5 shrink-0" />
        <span className="hidden truncate lg:inline">{firstName}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-1 w-56 border border-hairline bg-surface py-1.5 shadow-lg"
        >
          <div className="border-b border-hairline px-4 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-medium text-ink-900">{firstName}</p>
            <p className="truncate text-2xs text-ink-500" dir="ltr">
              {customer?.email}
            </p>
          </div>

          {(
            [
              { key: "orders", href: "/account/orders", badge: null },
              { key: "wishlist", href: "/account/wishlist", badge: count },
              { key: "addresses", href: "/account/addresses", badge: null },
              { key: "profile", href: "/account/profile", badge: null },
            ] as const
          ).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-ink-700 transition-colors hover:bg-sand-100 hover:text-ink-900"
            >
              {t(item.key)}
              {item.badge ? (
                <span className="tabular text-2xs text-ink-400">{item.badge}</span>
              ) : null}
            </Link>
          ))}

          <button
            type="button"
            role="menuitem"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await signOut();
                setOpen(false);
                router.push("/");
                // The layout resolves the session on the server, so without a
                // refresh the header would keep showing the name until the
                // next full page load.
                router.refresh();
              })
            }
            className={cn(
              "mt-1 w-full border-t border-hairline px-4 py-2.5 text-start text-sm",
              "text-ink-500 transition-colors hover:bg-sand-100 hover:text-brick-600",
              "disabled:opacity-60",
            )}
          >
            {isPending ? t("submitting") : t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
