"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { EditUserForm } from "@/components/users/edit-user-form"
import { UserRolesPanel } from "@/components/users/user-roles-panel"
import { usersApi } from "@/lib/api/endpoints"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"

export default function UserDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.userView}>
      <UserDetailContent />
    </RequireRoutePermission>
  )
}

function UserDetailContent() {
  const t = useTranslations("users")
  const params = useParams<{ id: string }>()
  const userId = Number(params.id)

  const userQuery = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: ({ signal }) => usersApi.get(userId, signal),
    enabled: Number.isFinite(userId),
  })

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/users" },
          { label: userQuery.data?.full_name ?? t("detailTitle") },
        ]}
      />

      {userQuery.isLoading && <ListLoadingSkeleton rows={4} />}
      {userQuery.isError && (
        <ListErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} />
      )}

      {userQuery.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <EditUserForm user={userQuery.data} />
          <UserRolesPanel userId={userId} userName={userQuery.data.full_name} />
        </div>
      )}
    </div>
  )
}
