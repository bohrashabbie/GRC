"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

import { isApiError } from "@/lib/api/errors"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Retrying a 401/403/404/422 just repeats a decided answer. The API
          // client already handles the one legitimate 401 retry via refresh.
          if (isApiError(error)) {
            if (error.status >= 400 && error.status < 500) return false
          }
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState so the client isn't recreated on re-render, and each SSR request
  // gets its own instance rather than sharing one across users.
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
