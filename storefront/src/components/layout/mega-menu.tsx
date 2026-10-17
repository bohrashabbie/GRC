"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ChevronForwardIcon } from "@/components/ui/icons";
import type { CategoryNode } from "@/types/shop";
import { cn } from "@/lib/utils";
import { imageProps } from "@/lib/images";

/**
 * Desktop mega menu.
 *
 * Opens on hover *and* on focus, and closes on Escape or when focus leaves the
 * subtree — a hover-only implementation is unreachable by keyboard, which for
 * a store's primary navigation is not an acceptable trade.
 */
export function MegaMenu({ categories }: { categories: CategoryNode[] }) {
  const t = useTranslations("header");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function open(slug: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenSlug(slug);
  }

  // A short grace period stops the panel flickering shut while the pointer
  // travels the gap between the trigger and the panel below it.
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSlug(null), 120);
  }

  return (
    <nav
      aria-label={t("allCategories")}
      className="relative hidden lg:block"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpenSlug(null);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpenSlug(null);
      }}
    >
      <ul className="container-site flex items-stretch gap-1">
        {categories.map((category) => {
          const isOpen = openSlug === category.slug;
          const hasChildren = category.children.length > 0;

          return (
            <li
              key={category.slug}
              className="relative"
              onMouseEnter={() => open(category.slug)}
              onMouseLeave={scheduleClose}
            >
              <Link
                href={`/c/${category.slug}`}
                onFocus={() => open(category.slug)}
                aria-expanded={hasChildren ? isOpen : undefined}
                className={cn(
                  "relative flex h-12 items-center px-3.5 text-sm text-ink-700 transition-colors",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:origin-center",
                  "after:scale-x-0 after:bg-gold-500 after:transition-transform after:duration-200",
                  isOpen && "text-ink-900 after:scale-x-100",
                )}
              >
                {category.name}
              </Link>

              {hasChildren && isOpen && (
                <div
                  // Anchored under its own tab rather than spanning the bar:
                  // the links read top to bottom, and the artwork sits right
                  // beside them instead of at the far end of the screen.
                  className="absolute start-0 top-full z-40 border-t border-hairline bg-surface shadow-overlay"
                  onMouseEnter={() => open(category.slug)}
                  onMouseLeave={scheduleClose}
                >
                  <div className="flex gap-8 p-7">
                    <div
                      className={cn(
                        "flex flex-col",
                        category.children.length > 8 ? "w-[28rem]" : "w-56",
                      )}
                    >
                      <p className="eyebrow pb-3">{category.name}</p>
                      {/* A long list flows into a second column rather than
                          growing taller than the artwork beside it. */}
                      <ul
                        className={cn(
                          "flex-1",
                          category.children.length > 8 && "columns-2 gap-x-8",
                        )}
                      >
                        {category.children.map((child) => (
                          <li key={child.slug} className="break-inside-avoid">
                            <Link
                              href={`/c/${child.slug}`}
                              className="group flex items-baseline justify-between gap-3 border-b border-hairline py-2.5 text-sm text-ink-600 transition-colors hover:text-ink-900"
                            >
                              <span className="transition-[translate] group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                                {child.name}
                              </span>
                              <span className="tabular text-2xs text-ink-400">
                                {child.product_count}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/c/${category.slug}`}
                        className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-900"
                      >
                        {t("viewAll")}
                        {/* scaleX comes from `flip-rtl` (the `transform`
                            property) and the nudge from `translate` — different
                            properties in Tailwind v4, so they compose instead
                            of overwriting each other. */}
                        <ChevronForwardIcon className="size-4 flip-rtl text-gold-500 transition-[translate] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                      </Link>
                    </div>

                    {category.image && (
                      <Link
                        href={`/c/${category.slug}`}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="group block w-60 shrink-0 overflow-hidden bg-sand-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          {...imageProps(category.image, "240px")}
                          alt=""
                          className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}

        {/* Offers and Brands sit alongside the category tabs rather than inside
            the tree: both are different axes through the catalogue, and without
            an entry point here each was reachable only from a home page rail.
            Offers carries the gold accent — it is the promotional link, and the
            one shoppers go looking for by name. */}
        <li onMouseEnter={scheduleClose}>
          <Link
            href="/collections/offers"
            className="flex h-full items-center px-3 py-3.5 text-sm font-medium text-gold-600 transition-colors hover:text-gold-700"
          >
            {t("offers")}
          </Link>
        </li>
        <li onMouseEnter={scheduleClose}>
          <Link
            href="/brands"
            className="flex h-full items-center px-3 py-3.5 text-sm text-ink-800 transition-colors hover:text-gold-600"
          >
            {t("brands")}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
