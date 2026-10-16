import type { MediaImage } from "@/types/shop";

/**
 * `src` / `srcSet` / `sizes` for an <img> showing a catalogue image.
 *
 * The stored original is often a 1-2.5 MB PNG; the backend also keeps WebP
 * renditions at a few widths. With `sizes` describing how wide the slot is,
 * the browser fetches the smallest rendition that is sharp enough — a ~40 KB
 * file for a phone grid card instead of the 2 MB original. Every catalogue
 * <img> goes through this; a bare `src={image.url}` is what made pages slow.
 */
export function imageProps(image: Pick<MediaImage, "url" | "srcset">, sizes: string) {
  if (!image.srcset) return { src: image.url };
  return { src: image.url, srcSet: image.srcset, sizes };
}
