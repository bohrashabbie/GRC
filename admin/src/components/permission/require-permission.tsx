"use client"

import { usePermission } from "@/hooks/use-permission"
import type { PermissionKey } from "@/lib/permissions"

type RequirePermissionProps = {
  permission: PermissionKey | string
  children: React.ReactNode
  /** Rendered instead when the permission is missing. Defaults to nothing. */
  fallback?: React.ReactNode
}

/**
 * Hides UI the current user can't act on — buttons, sections, nav items.
 * This is convenience, not enforcement: the backend rejects the API call
 * regardless of what's rendered here.
 */
export function RequirePermission({
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const allowed = usePermission(permission)
  return allowed ? <>{children}</> : <>{fallback}</>
}
