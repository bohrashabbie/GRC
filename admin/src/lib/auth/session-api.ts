import { ApiError, ErrorCodes, type ApiErrorEnvelope } from "@/lib/api/errors"

/**
 * Calls to our own Next route handlers (/api/auth/*), which own the httpOnly
 * refresh cookie. They mirror the backend's {code, message, details} envelope,
 * so failures surface as the same ApiError the rest of the app already handles.
 */
async function sessionRoute<T>(path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    throw new ApiError(
      0,
      {
        code: ErrorCodes.networkError,
        message: "Couldn't reach the admin server.",
      },
      { cause }
    )
  }

  if (!response.ok) {
    let envelope: ApiErrorEnvelope
    try {
      const parsed = (await response.json()) as Partial<ApiErrorEnvelope>
      envelope = {
        code: parsed.code ?? ErrorCodes.httpError,
        message: parsed.message ?? "Request failed",
        details: (parsed.details as Record<string, unknown>) ?? null,
      }
    } catch {
      envelope = {
        code: ErrorCodes.httpError,
        message: response.statusText || "Request failed",
        details: null,
      }
    }
    throw new ApiError(response.status, envelope)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const sessionApi = {
  login: (email: string, password: string) =>
    sessionRoute<{ access_token: string }>("/api/auth/login", {
      email,
      password,
    }),
  logout: () => sessionRoute<void>("/api/auth/logout"),
}
