"use client"

import { useCallback } from "react"
import { useSearchParams } from "next/navigation"

import { usePathname, useRouter } from "@/i18n/navigation"

/**
 * Keeps a single filter value in sync with the URL query string so a
 * filtered list view is bookmarkable/shareable internally, per the "every
 * list view" convention — never hidden component state for filters.
 */
export function useQueryParam(key: string) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const value = searchParams.get(key)

  const setValue = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === null) {
        params.delete(key)
      } else {
        params.set(key, next)
      }
      const query = params.toString()
      router.replace(
        { pathname, query: query ? Object.fromEntries(params) : undefined },
        { scroll: false }
      )
    },
    [key, pathname, router, searchParams]
  )

  return [value, setValue] as const
}
