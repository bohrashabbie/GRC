import type { UseFormSetError, FieldValues, Path } from "react-hook-form"

/**
 * Every backend error — deliberate AppError, Pydantic validation failure,
 * IntegrityError, or an unhandled exception — is normalised by
 * Api/app/middleware/error.py into this envelope.
 */
export type ApiErrorEnvelope = {
  code: string
  message: string
  details?: Record<string, unknown> | null
}

/** Shape of details.fields for code === "validation_error". */
export type ApiFieldError = { field: string; message: string }

/** Stable codes worth branching on. Anything else falls through to a toast. */
export const ErrorCodes = {
  authenticationFailed: "authentication_failed",
  permissionDenied: "permission_denied",
  notFound: "not_found",
  conflict: "conflict",
  validationError: "validation_error",
  businessRuleViolation: "business_rule_violation",
  databaseError: "database_error",
  internalError: "internal_error",
  httpError: "http_error",
  /** Client-side only: the request never reached the API. */
  networkError: "network_error",
} as const

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown> | null

  constructor(
    status: number,
    envelope: ApiErrorEnvelope,
    options?: { cause?: unknown }
  ) {
    super(envelope.message, options)
    this.name = "ApiError"
    this.status = status
    this.code = envelope.code
    this.details = envelope.details ?? null
  }

  get isAuth(): boolean {
    return this.status === 401 || this.code === ErrorCodes.authenticationFailed
  }

  get isForbidden(): boolean {
    return this.status === 403 || this.code === ErrorCodes.permissionDenied
  }

  get isNotFound(): boolean {
    return this.status === 404 || this.code === ErrorCodes.notFound
  }

  get isValidation(): boolean {
    return this.code === ErrorCodes.validationError
  }

  /**
   * True for domain-rule violations (variant cap, insufficient stock, invalid
   * status transition). These get shown inline next to the triggering action,
   * not just toasted — the user has to change something to proceed.
   */
  get isBusinessRule(): boolean {
    return this.code === ErrorCodes.businessRuleViolation
  }

  /** Field errors from a validation_error, or [] for any other code. */
  get fieldErrors(): ApiFieldError[] {
    const raw = this.details?.fields
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (entry): entry is ApiFieldError =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ApiFieldError).field === "string" &&
        typeof (entry as ApiFieldError).message === "string"
    )
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Push a validation_error's field errors back onto the matching form inputs.
 * Returns the errors that had no matching field so the caller can surface them
 * (as a form-level message) instead of silently dropping them.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[]
): ApiFieldError[] {
  if (!isApiError(error) || !error.isValidation) return []

  const unmatched: ApiFieldError[] = []
  for (const fieldError of error.fieldErrors) {
    const match = knownFields.find((name) => name === fieldError.field)
    if (match) {
      setError(match, { type: "server", message: fieldError.message })
    } else {
      unmatched.push(fieldError)
    }
  }
  return unmatched
}
