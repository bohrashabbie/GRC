/** TEMPORARY fixture helpers. See ./README.md. */

import type { LocaleCode, MediaImage } from "@/types/shop";

export type Bilingual = Record<LocaleCode, string>;

export const t = (ar: string, en: string): Bilingual => ({ ar, en });

/** Eight source photos, cycled. `n` is 1-based and wraps. */
export function img(n: number, alt = ""): MediaImage {
  const index = ((n - 1) % 8) + 1;
  return {
    id: `media-${index}`,
    url: `/fixtures/product-${String(index).padStart(2, "0")}.jpg`,
    alt,
    width: 1067,
    height: 1600,
    available_widths: [320, 640, 960],
    blur_data_url: null,
  };
}

/**
 * Fixture pagination. Slices a list and returns an opaque cursor in the same
 * shape the real API uses, so the infinite-scroll code being written against
 * it is the code that will run against Postgres.
 */
export function paginate<T>(items: T[], cursor: string | null, size: number) {
  const start = cursor ? Number(Buffer.from(cursor, "base64").toString("utf8")) : 0;
  const slice = items.slice(start, start + size);
  const next = start + size;
  return {
    items: slice,
    next_cursor:
      next < items.length ? Buffer.from(String(next), "utf8").toString("base64") : null,
  };
}
