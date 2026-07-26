import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  REFRESH_COOKIE,
  SERVER_API_BASE_URL,
  clearRefreshCookie,
} from "@/lib/auth/cookie"

/**
 * Revokes the session server-side and clears the cookie.
 *
 * The cookie is cleared even if the backend call fails — a user who clicked
 * "sign out" must end up signed out locally regardless of what the API says.
 */
export async function POST() {
  const store = await cookies()
  const refreshToken = store.get(REFRESH_COOKIE)?.value

  if (refreshToken) {
    try {
      await fetch(`${SERVER_API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
      })
    } catch {
      // Best effort. The local session is torn down either way.
    }
  }

  const response = new NextResponse(null, { status: 204 })
  clearRefreshCookie(response.cookies)
  return response
}
