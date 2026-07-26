"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { authApi } from "@/lib/api/endpoints"
import { isApiError } from "@/lib/api/errors"
import { setUnauthenticatedHandler, refreshAccessToken } from "@/lib/api/client"
import { sessionApi } from "@/lib/auth/session-api"
import { clearAccessToken, setAccessToken } from "@/lib/auth/token-store"
import { useRouter } from "@/i18n/navigation"
import type { CurrentUserOut } from "@/lib/api/types"

type AuthStatus = "checking" | "authenticated" | "unauthenticated"

type AuthContextValue = {
  status: AuthStatus
  user: CurrentUserOut | null
  /** Flattened permission keys from the current user's roles. */
  permissions: Set<string>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Re-fetches /users/me — call after a mutation that could change your own roles. */
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>("checking")
  const [user, setUser] = useState<CurrentUserOut | null>(null)

  const teardown = useCallback(() => {
    clearAccessToken()
    setUser(null)
    setStatus("unauthenticated")
    queryClient.clear()
  }, [queryClient])

  // Any 401 that survives the API client's own refresh-and-retry lands here.
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      teardown()
      router.replace("/login")
    })
    return () => setUnauthenticatedHandler(null)
  }, [teardown, router])

  // On mount: try to resurrect a session from the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const token = await refreshAccessToken()
      if (cancelled) return
      if (!token) {
        setStatus("unauthenticated")
        return
      }
      try {
        const me = await authApi.me()
        if (cancelled) return
        setUser(me)
        setStatus("authenticated")
      } catch {
        if (cancelled) return
        teardown()
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
    // Runs once per app load; teardown is stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await sessionApi.login(email, password)
      setAccessToken(access_token)
      try {
        const me = await authApi.me()
        setUser(me)
        setStatus("authenticated")
      } catch (error) {
        teardown()
        throw error
      }
    },
    [teardown]
  )

  const logout = useCallback(async () => {
    try {
      await sessionApi.logout()
    } catch (error) {
      // Swallow: sign-out proceeds locally even if the API call fails, so a
      // dead network never traps a user in a "signed in" state they can't exit.
      if (!isApiError(error)) throw error
    } finally {
      teardown()
      router.replace("/login")
    }
  }, [teardown, router])

  const refetchUser = useCallback(async () => {
    if (status !== "authenticated") return
    try {
      const me = await authApi.me()
      setUser(me)
    } catch (error) {
      if (isApiError(error) && error.isAuth) {
        teardown()
        router.replace("/login")
        return
      }
      throw error
    }
  }, [status, teardown, router])

  const permissions = useMemo(
    () => new Set(user?.permissions ?? []),
    [user]
  )

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, permissions, login, logout, refetchUser }),
    [status, user, permissions, login, logout, refetchUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function useCurrentUser(): CurrentUserOut | null {
  return useAuth().user
}
