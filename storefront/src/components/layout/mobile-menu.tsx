"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ChevronForwardIcon, CloseIcon, MenuIcon } from "@/components/ui/icons";
import { LocaleSwitch } from "./locale-switch";
import type { CategoryNode } from "@/types/shop";
import { cn } from "@/lib/utils";

/**
 * Off-canvas drill-down, opened from two places — the header hamburger and the
 * mobile bottom nav — so the state lives in a provider rather than being
 * duplicated in each trigger.
 *
 * One level at a time rather than nested accordions: with seven departments
 * each holding up to six children, an all-expanded accordion is a 50-row
 * scroll on a phone.
 */

const MobileMenuContext = createContext<{ open: () => void } | null>(null);

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  if (!context) throw new Error("useMobileMenu must be used inside <MobileMenuProvider>");
  return context;
}

export function MobileMenuTrigger() {
  const t = useTranslations("header");
  const { open } = useMobileMenu();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={t("openMenu")}
      className="inline-flex size-10 items-center justify-center text-ink-800 lg:hidden"
    >
      <MenuIcon className="size-5" />
    </button>
  );
}

export function MobileMenuProvider({
  categories,
  children,
}: {
  categories: CategoryNode[];
  children: React.ReactNode;
}) {
  const t = useTranslations("header");
  const tNav = useTranslations("nav");
  const [isOpen, setIsOpen] = useState(false);
  const [drilled, setDrilled] = useState<CategoryNode | null>(null);

  const value = useMemo(() => ({ open: () => setIsOpen(true) }), []);

  // A drawer that leaves the page scrollable behind it feels broken on iOS.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  function close() {
    setIsOpen(false);
    // Reset the drill state only after the exit transition, so the panel
    // doesn't visibly snap back to the root list as it slides away.
    setTimeout(() => setDrilled(null), 250);
  }

  return (
    <MobileMenuContext.Provider value={value}>
      {children}

      <div
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          isOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          onClick={close}
          className={cn(
            "absolute inset-0 bg-ink-900/45 transition-opacity duration-200 ease-out-soft",
            isOpen ? "opacity-100" : "opacity-0",
          )}
        />

        <div
          role="dialog"
          aria-modal={isOpen}
          aria-label={t("allCategories")}
          className={cn(
            "absolute inset-y-0 start-0 flex w-[86%] max-w-sm flex-col bg-surface shadow-overlay",
            "transition-transform duration-200 ease-out-soft",
            // The panel always exits toward its own inline-start edge — left
            // in English, right in Arabic — so `rtl:` flips the sign.
            isOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-4">
            {drilled ? (
              <button
                type="button"
                onClick={() => setDrilled(null)}
                className="inline-flex items-center gap-2 text-sm text-ink-700"
              >
                <ChevronForwardIcon className="size-4 rotate-180 flip-rtl" />
                {tNav("back")}
              </button>
            ) : (
              <span className="eyebrow">{t("allCategories")}</span>
            )}

            <button
              type="button"
              onClick={close}
              aria-label={t("closeMenu")}
              className="inline-flex size-9 items-center justify-center text-ink-700"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {drilled ? (
              <ul className="divide-y divide-hairline">
                <li>
                  <Link
                    href={`/c/${drilled.slug}`}
                    onClick={close}
                    className="flex items-center justify-between px-4 py-3.5 text-sm text-ink-900"
                  >
                    <span className="font-medium">{drilled.name}</span>
                    <span className="text-2xs text-gold-700">{t("viewAll")}</span>
                  </Link>
                </li>
                {drilled.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/c/${child.slug}`}
                      onClick={close}
                      className="flex items-center justify-between px-4 py-3.5 text-sm text-ink-600"
                    >
                      {child.name}
                      <span className="tabular text-2xs text-ink-400">{child.product_count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-hairline">
                {categories.map((category) => (
                  <li key={category.slug}>
                    {category.children.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setDrilled(category)}
                        className="flex w-full items-center justify-between px-4 py-4 text-start text-sm text-ink-900"
                      >
                        {category.name}
                        <ChevronForwardIcon className="size-4 flip-rtl text-ink-400" />
                      </button>
                    ) : (
                      <Link
                        href={`/c/${category.slug}`}
                        onClick={close}
                        className="flex px-4 py-4 text-sm text-ink-900"
                      >
                        {category.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t border-hairline px-4 py-4">
            <LocaleSwitch className="text-ink-700" />
          </div>
        </div>
      </div>
    </MobileMenuContext.Provider>
  );
}
