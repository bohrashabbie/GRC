import "server-only";

import { cookies } from "next/headers";

/**
 * The customer session token, held in an httpOnly cookie.
 *
 * Server-only by construction: the token is never serialised into a page, put
 * in localStorage, or handed to a client component. Everything that needs it
 * is a Server Action, so browser JavaScript can act on the session without
 * ever being able to read the credential — which is the point of the cookie.
 */

const COOKIE_NAME = "grc.session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // matches the token's own lifetime

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Lax rather than Strict: a shopper following a link in an order email
    // should land already signed in, and no state-changing request here is a
    // plain top-level GET.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  // Deleted by name *and* path. A bare delete() only matches the default path,
  // so a cookie written at "/" can survive it and leave the shopper signed in
  // after pressing sign out. Overwriting with maxAge 0 as well covers browsers
  // that ignore a delete for a cookie they consider httpOnly-protected.
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  store.delete({ name: COOKIE_NAME, path: "/" });
}
