"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { PermissionMatrix } from "@/components/roles/permission-matrix"
import { rolesApi } from "@/lib/api/endpoints"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"

export default function RoleDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.roleView}>
      <RoleDetailContent />
    </RequireRoutePermission>
  )
}

function RoleDetailContent() {
  const t = useTranslations("roles")
  const params = useParams<{ id: string }>()
  const roleId = Number(params.id)

  const roleQuery = useQuery({
    queryKey: queryKeys.roles.detail(roleId),
    queryFn: ({ signal }) => rolesApi.get(roleId, signal),
    enabled: Number.isFinite(roleId),
  })

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/roles" },
          { label: roleQuery.data?.name_en ?? t("detailTitle") },
        ]}
      />

      {roleQuery.isLoading && <ListLoadingSkeleton rows={6} />}
      {roleQuery.isError && (
        <ListErrorState error={roleQuery.error} onRetry={() => roleQuery.refetch()} />
      )}

      {roleQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>
              {roleQuery.data.name_en} · {roleQuery.data.name_ar}
            </CardTitle>
            {roleQuery.data.description && (
              <CardDescription>{roleQuery.data.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <PermissionMatrix role={roleQuery.data} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
