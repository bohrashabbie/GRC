/**
 * The access token lives in module memory only — never localStorage, never a
 * readable cookie. It dies on reload and is re-minted from the httpOnly refresh
 * cookie by /api/auth/refresh.
 */

let accessToken: string | null = null

type Listener = (token: string | null) => void
const listeners = new Set<Listener>()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  for (const listener of listeners) listener(token)
}

export function clearAccessToken(): void {
  setAccessToken(null)
}

export function subscribeToAccessToken(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
