"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ChevronForwardIcon } from "@/components/ui/icons";
import type { Banner } from "@/types/shop";
import { cn } from "@/lib/utils";

/**
 * Hero carousel.
 *
 * Slides cross-fade rather than slide horizontally. A translate-based track
 * has to know which way "next" points and RTL `scrollLeft` semantics still
 * differ between engines; a fade sidesteps that entirely and reads calmer for
 * apparel anyway. The only direction-aware pieces left are the two chevrons.
 */
export function HeroSlider({ banners }: { banners: Banner[] }) {
  const t = useTranslations("home");
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback(
    (index: number) => setActive((index + banners.length) % banners.length),
    [banners.length],
  );

  useEffect(() => {
    if (isPaused || banners.length < 2) return;
    timer.current = setInterval(() => setActive((i) => (i + 1) % banners.length), 6000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [isPaused, banners.length]);

  if (banners.length === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      className="relative isolate overflow-hidden bg-ink-900"
    >
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[21/9]">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            aria-hidden={index !== active}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out-soft",
              index === active ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.desktop_image.url}
              alt={banner.desktop_image.alt ?? ""}
              // The first slide is the LCP element on the homepage, so it is
              // eager and high priority; the rest stay lazy.
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              className="size-full object-cover"
            />

            {/* Gradient runs from the inline-start edge so the overlay always
                sits behind the text, whichever side that text begins on. */}
            <div className="absolute inset-0 bg-gradient-to-r from-ink-900/80 via-ink-900/35 to-transparent rtl:bg-gradient-to-l" />

            <div className="absolute inset-0 flex items-center">
              <div className="container-site max-w-2xl">
                <p className="eyebrow text-gold-300">{banner.subtitle}</p>
                <h2 className="mt-3 font-display text-display-1 text-sand-50">{banner.title}</h2>
                {banner.cta_href && (
                  <Link
                    href={banner.cta_href}
                    tabIndex={index === active ? 0 : -1}
                    className="mt-7 inline-flex h-12 items-center rounded-xs bg-sand-50 px-7 text-sm font-medium text-ink-900 transition-colors hover:bg-gold-300"
                  >
                    {banner.cta_label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(active - 1)}
            aria-label={t("previousSlide")}
            className="absolute start-4 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-sand-50/35 text-sand-50 backdrop-blur-sm transition-colors hover:bg-sand-50/15 md:inline-flex"
          >
            <ChevronForwardIcon className="size-5 rotate-180 flip-rtl" />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            aria-label={t("nextSlide")}
            className="absolute end-4 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-sand-50/35 text-sand-50 backdrop-blur-sm transition-colors hover:bg-sand-50/15 md:inline-flex"
          >
            <ChevronForwardIcon className="size-5 flip-rtl" />
          </button>

          <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => go(index)}
                aria-label={t("goToSlide", { number: index + 1 })}
                aria-current={index === active}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  index === active ? "w-8 bg-gold-400" : "w-4 bg-sand-50/45 hover:bg-sand-50/70",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
