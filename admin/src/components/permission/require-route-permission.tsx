"use client"

import { usePermission } from "@/hooks/use-permission"
import { AccessDenied } from "@/components/states/access-denied"
import type { PermissionKey } from "@/lib/permissions"

/**
 * Full-page gate for a route, not just a button. Use at the top of a page
 * component so a typed URL or stale bookmark renders a clean "no access"
 * state instead of a half-broken UI making requests that all 403.
 */
export function RequireRoutePermission({
  permission,
  children,
}: {
  permission: PermissionKey | string
  children: React.ReactNode
}) {
  const allowed = usePermission(permission)
  if (!allowed) return <AccessDenied permission={permission} />
  return <>{children}</>
}
