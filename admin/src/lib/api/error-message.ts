import { isApiError } from "./errors"

/**
 * The single place that turns "any thrown value" into a string a toast or
 * inline error can show. Falls back to a generic message rather than ever
 * rendering a raw stack trace or [object Object] to a staff user.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
