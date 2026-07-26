"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ChevronForwardIcon } from "@/components/ui/icons";
import type { CategoryNode } from "@/types/shop";
import { cn } from "@/lib/utils";

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
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenSlug(null);
      }}
    >
      <ul className="container-site flex items-stretch gap-1">
        {categories.map((category) => {
          const isOpen = openSlug === category.slug;
          const hasChildren = category.children.length > 0;

          return (
            <li
              key={category.slug}
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
                  className="absolute inset-x-0 top-full z-40 border-t border-hairline bg-surface shadow-overlay"
                  onMouseEnter={() => open(category.slug)}
                  onMouseLeave={scheduleClose}
                >
                  {/* A fixed promo column rather than a 1/4 fraction: at
                      1440 a quarter-width image made the panel ~390px tall and
                      stretched the link rows apart to match it. */}
                  <div className="container-site grid grid-cols-[1fr_240px] gap-10 py-8">
                    {/* `content-start` packs the rows to the top instead of
                        distributing them over the promo column's height. */}
                    <div className="grid grid-cols-3 content-start gap-x-8">
                      {category.children.map((child) => (
                        <Link
                          key={child.slug}
                          href={`/c/${child.slug}`}
                          className="group flex items-baseline gap-2 py-2 text-sm text-ink-600 transition-colors hover:text-ink-900"
                        >
                          <span className="border-b border-transparent transition-colors group-hover:border-gold-500">
                            {child.name}
                          </span>
                          <span className="tabular text-2xs text-ink-400">{child.product_count}</span>
                        </Link>
                      ))}
                    </div>

                    <Link
                      href={`/c/${category.slug}`}
                      className="group flex flex-col gap-3 border-s border-hairline ps-8"
                    >
                      {category.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.image.url}
                          alt=""
                          // A 4:5 crop here made the panel ~460px tall for six
                          // links. The panel height should follow the link
                          // list, not the artwork.
                          className="aspect-[4/3] w-full bg-sand-100 object-cover"
                        />
                      )}
                      <span className="inline-flex items-center gap-1.5 text-sm text-ink-900">
                        {t("viewAll")}
                        {/* scaleX comes from `flip-rtl` (the `transform`
                            property) and the nudge from `translate` — different
                            properties in Tailwind v4, so they compose instead
                            of overwriting each other. */}
                        <ChevronForwardIcon className="size-4 flip-rtl text-gold-500 transition-[translate] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
