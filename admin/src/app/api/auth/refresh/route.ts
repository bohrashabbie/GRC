import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  REFRESH_COOKIE,
  SERVER_API_BASE_URL,
  clearRefreshCookie,
  setRefreshCookie,
} from "@/lib/auth/cookie"
import type { RefreshResponse } from "@/lib/api/types"

/**
 * Mints a fresh access token from the httpOnly refresh cookie and rotates the
 * cookie, because the backend revokes the old refresh token on every call.
 *
 * Called on app load (to restore a session across reloads) and by the API
 * client after a 401. The client single-flights this so parallel 401s can't
 * fire competing rotations that revoke each other.
 */
export async function POST() {
  const store = await cookies()
  const refreshToken = store.get(REFRESH_COOKIE)?.value

  if (!refreshToken) {
    return NextResponse.json(
      { code: "authentication_failed", message: "No active session." },
      { status: 401 }
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(`${SERVER_API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      {
        code: "network_error",
        message: `Can't reach the API at ${SERVER_API_BASE_URL}.`,
      },
      { status: 502 }
    )
  }

  if (!upstream.ok) {
    // Expired, revoked, or already-rotated token — drop it so the user gets a
    // clean login instead of retrying a dead cookie on every request.
    const body = await upstream.text()
    const response = new NextResponse(body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    })
    clearRefreshCookie(response.cookies)
    return response
  }

  const data = (await upstream.json()) as RefreshResponse
  const response = NextResponse.json({ access_token: data.access_token })
  setRefreshCookie(response.cookies, data.refresh_token)
  return response
}
