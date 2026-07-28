"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { signOut } from "@/app/actions";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "orders", href: "/account/orders" },
  { key: "addresses", href: "/account/addresses" },
  { key: "wishlist", href: "/account/wishlist" },
  { key: "profile", href: "/account/profile" },
] as const;

export function AccountNav() {
  const t = useTranslations("account");
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <nav aria-label={t("title")}>
      <ul className="flex gap-1 overflow-x-auto border-b border-hairline lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:border-e">
        {ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  "block whitespace-nowrap px-4 py-3 text-sm transition-colors",
                  // The active marker sits on the bottom edge in the mobile
                  // tab row and on the inline-end edge in the desktop sidebar.
                  "border-b-2 lg:border-b-0 lg:border-e-2 lg:-me-px",
                  isActive
                    ? "border-gold-500 text-ink-900"
                    : "border-transparent text-ink-500 hover:text-ink-900",
                )}
              >
                {t(item.key)}
              </Link>
            </li>
          );
        })}

        <li className="lg:mt-6 lg:border-t lg:border-hairline lg:pt-4">
          {/* A link to the login page is not a sign-out — the cookie has to be
              cleared, and the layout re-read, or the shopper stays signed in. */}
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await signOut();
                router.push("/");
                router.refresh();
              })
            }
            className="block w-full whitespace-nowrap px-4 py-3 text-start text-sm text-ink-400 transition-colors hover:text-brick-600 disabled:opacity-60"
          >
            {t("signOut")}
          </button>
        </li>
      </ul>
    </nav>
  );
}
