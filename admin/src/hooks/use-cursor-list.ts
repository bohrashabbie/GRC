import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query"

import type { CursorPage } from "@/lib/api/types"

/**
 * Thin wrapper over useInfiniteQuery for the backend's {items, next_cursor}
 * shape. Every list endpoint in this API is cursor-paginated on
 * (created_at, id) — never OFFSET — so this is the one hook every list page
 * should use instead of hand-rolling pagination state.
 */
export function useCursorList<T>({
  queryKey,
  fetchPage,
  enabled = true,
}: {
  queryKey: QueryKey
  fetchPage: (cursor: string | null, signal: AbortSignal) => Promise<CursorPage<T>>
  enabled?: boolean
}) {
  const query = useInfiniteQuery({
    // The same logical key (e.g. queryKeys.brands.list(...)) is also used by
    // plain useQuery lookups that feed dropdowns. Those cache a CursorPage,
    // while an infinite query caches {pages, pageParams} — sharing a key makes
    // whichever mounts second read the wrong shape and crash. The suffix keeps
    // the two apart while staying a prefix-match for `queryKeys.*.all`
    // invalidation, so mutations still refresh both.
    queryKey: [...queryKey, "infinite"],
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? null,
    enabled,
  })

  const items = query.data?.pages.flatMap((page) => page?.items ?? []) ?? []

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
