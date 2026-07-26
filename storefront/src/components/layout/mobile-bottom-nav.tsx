"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { BagIcon, GridIcon, MenuIcon, UserIcon } from "@/components/ui/icons";
import { useMobileMenu } from "./mobile-menu";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "shop", href: "/c", Icon: GridIcon },
  { key: "cart", href: "/cart", Icon: BagIcon },
  { key: "account", href: "/account", Icon: UserIcon },
] as const;

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { open } = useMobileMenu();

  const itemClass =
    "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.625rem] transition-colors";

  return (
    <nav
      aria-label={t("menu")}
      // `pb-[env(safe-area-inset-bottom)]` keeps the row clear of the iOS home
      // indicator, which otherwise sits on top of the account tab.
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-sand-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex items-stretch">
        {ITEMS.map(({ key, href, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={key}
              href={href}
              className={cn(itemClass, isActive ? "text-palm-600" : "text-ink-500")}
            >
              <Icon className="size-5" />
              {t(key)}
            </Link>
          );
        })}

        <button type="button" onClick={open} className={cn(itemClass, "text-ink-500")}>
          <MenuIcon className="size-5" />
          {t("menu")}
        </button>
      </div>
    </nav>
  );
}
