import { ApiError, ErrorCodes, type ApiErrorEnvelope } from "./errors"
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/token-store"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"

export type QueryValue = string | number | boolean | null | undefined

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  query?: Record<string, QueryValue>
  signal?: AbortSignal
  /** Skip the Authorization header and the 401 refresh dance entirely. */
  skipAuth?: boolean
}

/* -------------------------------------------------------------------------- */
/* Unauthenticated handler                                                     */
/* -------------------------------------------------------------------------- */

let onUnauthenticated: (() => void) | null = null

/** Wired up once by AuthProvider so the client can bounce to /login. */
export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler
}

/* -------------------------------------------------------------------------- */
/* Single-flight refresh                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The backend rotates the refresh token on every /auth/refresh and revokes the
 * old one. If several queries 401 at once and each fires its own refresh, they
 * revoke each other and the session dies. So all callers share one in-flight
 * promise.
 */
let refreshInFlight: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) {
        clearAccessToken()
        return null
      }
      const data = (await response.json()) as { access_token?: string }
      if (!data.access_token) {
        clearAccessToken()
        return null
      }
      setAccessToken(data.access_token)
      return data.access_token
    } catch {
      clearAccessToken()
      return null
    } finally {
      // Release on the next tick so concurrent callers awaiting this promise
      // all observe the same result before a new refresh can start.
      queueMicrotask(() => {
        refreshInFlight = null
      })
    }
  })()

  return refreshInFlight
}

/* -------------------------------------------------------------------------- */
/* Core fetch                                                                  */
/* -------------------------------------------------------------------------- */

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(
    `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
  )
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function toApiError(response: Response): Promise<ApiError> {
  let envelope: ApiErrorEnvelope
  try {
    const parsed = (await response.json()) as Partial<ApiErrorEnvelope>
    envelope = {
      code: typeof parsed.code === "string" ? parsed.code : ErrorCodes.httpError,
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : response.statusText || "Request failed",
      details:
        parsed.details && typeof parsed.details === "object"
          ? (parsed.details as Record<string, unknown>)
          : null,
    }
  } catch {
    // Non-JSON body (proxy error page, empty 502, …).
    envelope = {
      code: ErrorCodes.httpError,
      message: response.statusText || `Request failed (${response.status})`,
      details: null,
    }
  }
  return new ApiError(response.status, envelope)
}

async function parseBody<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function rawRequest(
  path: string,
  options: RequestOptions,
  token: string | null
): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }
  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    // The API is cross-origin and bearer-authenticated; no cookies are sent.
    credentials: "omit",
    cache: "no-store",
  })
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  let response: Response
  try {
    response = await rawRequest(path, options, getAccessToken())
  } catch (cause) {
    if (options.signal?.aborted) throw cause
    throw new ApiError(
      0,
      {
        code: ErrorCodes.networkError,
        message: `Can't reach the API at ${API_BASE_URL}. Is the backend running?`,
      },
      { cause }
    )
  }

  // One refresh + one retry, then give up.
  if (response.status === 401 && !options.skipAuth) {
    const token = await refreshAccessToken()
    if (!token) {
      onUnauthenticated?.()
      throw await toApiError(response)
    }
    try {
      response = await rawRequest(path, options, token)
    } catch (cause) {
      if (options.signal?.aborted) throw cause
      throw new ApiError(
        0,
        {
          code: ErrorCodes.networkError,
          message: `Can't reach the API at ${API_BASE_URL}.`,
        },
        { cause }
      )
    }
    if (response.status === 401) {
      clearAccessToken()
      onUnauthenticated?.()
    }
  }

  if (!response.ok) throw await toApiError(response)
  return parseBody<T>(response)
}

/**
 * Multipart upload. Kept separate from apiFetch because the body must stay a
 * FormData instance — setting Content-Type manually would omit the multipart
 * boundary the browser generates.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  async function send(token: string | null): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return fetch(buildUrl(path), {
      method: "POST",
      headers,
      body: formData,
      credentials: "omit",
      cache: "no-store",
    })
  }

  let response: Response
  try {
    response = await send(getAccessToken())
  } catch (cause) {
    throw new ApiError(
      0,
      {
        code: ErrorCodes.networkError,
        message: `Can't reach the API at ${API_BASE_URL}.`,
      },
      { cause }
    )
  }

  if (response.status === 401) {
    const token = await refreshAccessToken()
    if (!token) {
      onUnauthenticated?.()
      throw await toApiError(response)
    }
    response = await send(token)
  }

  if (!response.ok) throw await toApiError(response)
  return parseBody<T>(response)
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiFetch<T>(path, { ...options, method: "POST", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiFetch<T>(path, { ...options, method: "PATCH", body }),
  del: <T = void>(path: string, options?: Omit<RequestOptions, "method">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
}

export { API_BASE_URL }
