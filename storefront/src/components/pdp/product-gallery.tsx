"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { ChevronForwardIcon } from "@/components/ui/icons";
import type { MediaImage } from "@/types/shop";
import { cn } from "@/lib/utils";

type GalleryMedia = MediaImage & { option_value_id: string | null };

/**
 * Gallery filtered by the selected colour.
 *
 * Images tagged with a colour only show when that colour is picked; images
 * with a null `option_value_id` show for every colour. Changing colour resets
 * to the first image, otherwise the shopper is left looking at index 3 of a
 * set that now has two entries.
 */
export function ProductGallery({
  media,
  selectedColourId,
  productName,
}: {
  media: GalleryMedia[];
  selectedColourId: string | null;
  productName: string;
}) {
  const t = useTranslations("pdp");

  const visible = useMemo(() => {
    const filtered = media.filter(
      (item) => item.option_value_id === null || item.option_value_id === selectedColourId,
    );
    return filtered.length > 0 ? filtered : media;
  }, [media, selectedColourId]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [selectedColourId]);

  if (visible.length === 0) return null;

  const current = visible[Math.min(index, visible.length - 1)];
  const go = (next: number) => setIndex((next + visible.length) % visible.length);

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
      {visible.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible">
          {visible.map((item, i) => (
            <li key={`${item.id}-${i}`} className="w-16 shrink-0 lg:w-full">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t("galleryThumb", { number: i + 1 })}
                aria-current={i === index}
                className={cn(
                  "block w-full overflow-hidden bg-sand-100 ring-1 ring-inset transition-all",
                  i === index ? "ring-2 ring-gold-500" : "ring-hairline hover:ring-hairline-strong",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" loading="lazy" className="aspect-[2/3] w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative flex-1 overflow-hidden bg-sand-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt ?? productName}
          // The PDP hero image is the LCP element — never lazy.
          loading="eager"
          fetchPriority="high"
          className="aspect-[2/3] w-full object-cover"
        />

        {visible.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={t("galleryPrevious")}
              className="absolute start-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-sand-50/85 text-ink-800 backdrop-blur-sm transition-colors hover:bg-sand-50"
            >
              <ChevronForwardIcon className="size-5 rotate-180 flip-rtl" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={t("galleryNext")}
              className="absolute end-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-sand-50/85 text-ink-800 backdrop-blur-sm transition-colors hover:bg-sand-50"
            >
              <ChevronForwardIcon className="size-5 flip-rtl" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
