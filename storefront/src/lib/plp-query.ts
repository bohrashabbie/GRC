import type { ListQuery } from "@/lib/shop-api";

/**
 * Facet state lives in the URL, not in component state — so a filtered
 * listing is shareable, bookmarkable, and survives a back button. These two
 * functions are the only place that encoding is defined.
 *
 * Multi-value facets are comma-joined (`?colour=ivory,navy`) rather than
 * repeated keys, which keeps the URL short enough to stay readable.
 */

export const SORT_OPTIONS = ["relevance", "newest", "price_asc", "price_desc", "rating"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export type RawSearchParams = Record<string, string | string[] | undefined>;

function readList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw.split(",").map((part) => part.trim()).filter(Boolean);
}

function readNumber(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() ? raw.trim() : undefined;
}

export function parseListQuery(
  params: RawSearchParams,
  category?: string,
  collection?: string,
): ListQuery {
  const sort = readString(params.sort);

  return {
    category,
    collection,
    q: readString(params.q),
    colour: readList(params.colour),
    size: readList(params.size),
    season: readList(params.season),
    minPrice: readNumber(params.min_price),
    maxPrice: readNumber(params.max_price),
    sort: SORT_OPTIONS.includes(sort as SortOption) ? sort : undefined,
    cursor: null,
  };
}

/**
 * A stable string identity for a filter set. The results list uses it to
 * decide when accumulated "load more" pages are stale and must be dropped.
 */
export function queryKey(query: ListQuery): string {
  return JSON.stringify({
    category: query.category ?? null,
    collection: query.collection ?? null,
    q: query.q ?? null,
    colour: [...(query.colour ?? [])].sort(),
    size: [...(query.size ?? [])].sort(),
    season: [...(query.season ?? [])].sort(),
    minPrice: query.minPrice ?? null,
    maxPrice: query.maxPrice ?? null,
    sort: query.sort ?? null,
  });
}

/** Count of active facet selections, for the mobile "Filters (3)" badge. */
export function activeFilterCount(query: ListQuery): number {
  return (
    (query.colour?.length ?? 0) +
    (query.size?.length ?? 0) +
    (query.season?.length ?? 0) +
    (query.minPrice !== undefined || query.maxPrice !== undefined ? 1 : 0)
  );
}

/** Applies one facet change on top of the current params, for the client. */
export function toggleFacetValue(
  params: URLSearchParams,
  code: string,
  value: string,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const current = readList(next.get(code) ?? undefined);
  const updated = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];

  if (updated.length) next.set(code, updated.join(","));
  else next.delete(code);

  return next;
}
