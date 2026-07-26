import { NextResponse } from "next/server"

import {
  SERVER_API_BASE_URL,
  clearRefreshCookie,
  setRefreshCookie,
} from "@/lib/auth/cookie"
import type { LoginResponse } from "@/lib/api/types"

/**
 * Proxies POST /auth/login so the refresh token can be stored in an httpOnly
 * cookie server-side. Only the access token is handed back to the browser.
 */
export async function POST(request: Request) {
  let payload: { email?: string; password?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { code: "validation_error", message: "Malformed request body." },
      { status: 400 }
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(`${SERVER_API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email ?? "",
        password: payload.password ?? "",
      }),
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      {
        code: "network_error",
        message: `Can't reach the API at ${SERVER_API_BASE_URL}. Is the backend running?`,
      },
      { status: 502 }
    )
  }

  // Pass the backend's {code, message, details} envelope straight through so the
  // login form can branch on the same codes as every other request.
  if (!upstream.ok) {
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  const data = (await upstream.json()) as LoginResponse

  // CLAUDE.md rule 13 disables MFA, but the endpoint still carries the branch.
  // Fail loudly rather than handing back a null access token.
  if (data.mfa_required || !data.access_token || !data.refresh_token) {
    const response = NextResponse.json(
      {
        code: "mfa_required",
        message:
          "This account requires two-factor authentication, which the admin panel doesn't support.",
      },
      { status: 501 }
    )
    clearRefreshCookie(response.cookies)
    return response
  }

  const response = NextResponse.json({ access_token: data.access_token })
  setRefreshCookie(response.cookies, data.refresh_token)
  return response
}
