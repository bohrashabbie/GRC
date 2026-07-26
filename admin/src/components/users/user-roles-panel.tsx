"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import { RequirePermission } from "@/components/permission/require-permission"
import { AssignRoleDialog } from "./assign-role-dialog"
import { getErrorMessage } from "@/lib/api/error-message"
import { rolesApi, usersApi } from "@/lib/api/endpoints"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { UserRoleAssignmentOut } from "@/lib/api/types"

export function UserRolesPanel({
  userId,
  userName,
}: {
  userId: number
  userName: string
}) {
  const t = useTranslations("users")
  const c = useTranslations("common")
  const format = useFormatter()
  const queryClient = useQueryClient()
  const [revokeTarget, setRevokeTarget] = useState<UserRoleAssignmentOut | null>(null)

  const assignmentsQuery = useQuery({
    queryKey: queryKeys.users.roles(userId),
    queryFn: ({ signal }) => usersApi.listRoles(userId, signal),
  })

  // Role code -> display name. The assignment payload only carries role_code,
  // so the full role list fills in the bilingual label.
  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: ({ signal }) => rolesApi.list(signal),
  })
  const roleLabel = (code: string) => {
    const role = rolesQuery.data?.find((r) => r.code === code)
    return role ? `${role.name_en} · ${role.name_ar}` : code
  }

  async function handleRevoke(assignment: UserRoleAssignmentOut) {
    try {
      await usersApi.revokeRole(userId, assignment.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.roles(userId) })
      toast.success(t("roles.revoked"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>{t("roles.title")}</CardTitle>
          <CardDescription>{t("roles.description")}</CardDescription>
        </div>
        <RequirePermission permission={PERMISSIONS.userAssignRole}>
          <AssignRoleDialog userId={userId} />
        </RequirePermission>
      </CardHeader>
      <CardContent>
        {assignmentsQuery.isLoading && <ListLoadingSkeleton rows={2} />}
        {assignmentsQuery.isError && (
          <ListErrorState
            error={assignmentsQuery.error}
            onRetry={() => assignmentsQuery.refetch()}
          />
        )}
        {assignmentsQuery.data && assignmentsQuery.data.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("roles.empty")}</p>
        )}
        {assignmentsQuery.data && assignmentsQuery.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {assignmentsQuery.data.map((assignment) => (
              <li
                key={assignment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {roleLabel(assignment.role_code)}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      {assignment.location_id
                        ? `#${assignment.location_id}`
                        : t("roles.locationAll")}
                    </Badge>
                    <span>
                      {t("roles.grantedAt")}:{" "}
                      {format.dateTime(new Date(assignment.granted_at), "short")}
                    </span>
                    {assignment.expires_at && (
                      <span>
                        · {t("roles.expiresAt")}:{" "}
                        {format.dateTime(new Date(assignment.expires_at), "short")}
                      </span>
                    )}
                  </div>
                </div>
                <RequirePermission permission={PERMISSIONS.userAssignRole}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRevokeTarget(assignment)}
                  >
                    {t("roles.revoke")}
                  </Button>
                </RequirePermission>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {revokeTarget && (
        <ConfirmDialog
          open={!!revokeTarget}
          onOpenChange={(open) => !open && setRevokeTarget(null)}
          title={t("roles.revokeTitle")}
          description={t("roles.revokeDescription", {
            role: roleLabel(revokeTarget.role_code),
            name: userName,
          })}
          confirmLabel={t("roles.revoke")}
          onConfirm={() => handleRevoke(revokeTarget)}
        />
      )}
    </Card>
  )
}
