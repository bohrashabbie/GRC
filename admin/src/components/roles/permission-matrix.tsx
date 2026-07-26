"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import { RequirePermission } from "@/components/permission/require-permission"
import { PermissionCheckboxGrid } from "./permission-checkbox-grid"
import { getErrorMessage } from "@/lib/api/error-message"
import { rolesApi } from "@/lib/api/endpoints"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { RoleDetailOut } from "@/lib/api/types"

export function PermissionMatrix({ role }: { role: RoleDetailOut }) {
  const t = useTranslations("roles")
  const c = useTranslations("common")
  const queryClient = useQueryClient()

  const permissionsQuery = useQuery({
    queryKey: queryKeys.roles.permissions(),
    queryFn: ({ signal }) => rolesApi.permissions(signal),
  })

  const original = useMemo(() => new Set(role.permission_keys), [role.permission_keys])
  const [selected, setSelected] = useState<Set<string>>(original)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Reset local selection whenever the loaded role changes (navigating
  // between roles, or a background refetch after a successful save).
  const [syncedRoleId, setSyncedRoleId] = useState(role.id)
  if (syncedRoleId !== role.id) {
    setSyncedRoleId(role.id)
    setSelected(original)
  }

  const granted = [...selected].filter((key) => !original.has(key))
  const revoked = [...original].filter((key) => !selected.has(key))
  const isDirty = granted.length > 0 || revoked.length > 0

  function discard() {
    setSelected(new Set(original))
  }

  async function save() {
    try {
      await rolesApi.setPermissions(role.id, [...selected])
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      toast.success(t("saved"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  if (permissionsQuery.isLoading) return <ListLoadingSkeleton rows={8} />
  if (permissionsQuery.isError) {
    return (
      <ListErrorState
        error={permissionsQuery.error}
        onRetry={() => permissionsQuery.refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">{t("matrixTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("matrixDescription")}</p>
      </div>

      <PermissionCheckboxGrid
        permissions={permissionsQuery.data ?? []}
        selected={selected}
        onChange={setSelected}
      />

      <RequirePermission permission={PERMISSIONS.roleManagePermissions}>
        <div className="flex items-center justify-end gap-3">
          {isDirty && (
            <>
              <span className="text-xs text-muted-foreground">
                {t("unsavedChanges", { count: granted.length + revoked.length })}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={discard}>
                {t("discard")}
              </Button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!isDirty}
            onClick={() => setConfirmOpen(true)}
          >
            {t("saveChanges")}
          </Button>
        </div>
      </RequirePermission>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive={false}
        title={t("confirmTitle", { role: role.name_en })}
        description={t("confirmDescription", {
          granted: granted.length,
          revoked: revoked.length,
        })}
        confirmLabel={t("saveChanges")}
        onConfirm={save}
      />
    </div>
  )
}
