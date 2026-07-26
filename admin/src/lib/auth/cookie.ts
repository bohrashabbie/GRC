import "server-only"

import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies"

/**
 * The refresh token is the long-lived credential, so it never touches client
 * JS: it lives in an httpOnly cookie that only these route handlers read.
 * The access token is short-lived and returned to the browser to hold in memory.
 */
export const REFRESH_COOKIE = "grc_refresh"

/** Matches Api settings.refresh_token_expire_days (30). */
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export const SERVER_API_BASE_URL = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "")

function isSecure(): boolean {
  // Must stay off for local http, or the browser silently drops the cookie.
  return process.env.AUTH_COOKIE_SECURE === "1"
}

export function setRefreshCookie(cookies: ResponseCookies, token: string): void {
  cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure(),
    path: "/",
    maxAge: REFRESH_MAX_AGE_SECONDS,
  })
}

export function clearRefreshCookie(cookies: ResponseCookies): void {
  cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure(),
    path: "/",
    maxAge: 0,
  })
}
