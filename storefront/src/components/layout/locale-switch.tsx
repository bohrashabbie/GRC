"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { GlobeIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Swaps locale while staying on the same route. next-intl's `usePathname`
 * returns the path with the locale prefix already stripped and dynamic
 * segments left resolved, so handing it straight back to `Link` with the
 * other locale rebuilds the correct URL for whatever page we are on.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations("topbar");
  const locale = useLocale() as Locale;
  const pathname = usePathname();

  const other: Locale = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
      locale={other}
      aria-label={t("switchToAria")}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs transition-colors hover:text-gold-300",
        className,
      )}
    >
      <GlobeIcon className="size-4" />
      <span>{t("switchTo")}</span>
    </Link>
  );
}
