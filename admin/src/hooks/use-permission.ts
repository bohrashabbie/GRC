import { useAuth } from "@/providers/auth-provider"
import type { PermissionKey } from "@/lib/permissions"

/**
 * Cosmetic gate only — the backend's require("permission.key") dependency is
 * the real boundary. This just decides what to show, never what to allow.
 */
export function usePermission(permission: PermissionKey | string): boolean {
  const { permissions } = useAuth()
  return permissions.has(permission)
}

export function useHasAnyPermission(
  permissionKeys: readonly (PermissionKey | string)[]
): boolean {
  const { permissions } = useAuth()
  return permissionKeys.some((key) => permissions.has(key))
}
