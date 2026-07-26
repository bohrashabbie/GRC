"use client"

import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { DataTable } from "@/components/data-table"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { CreateRoleDialog } from "@/components/roles/create-role-dialog"
import { rolesApi } from "@/lib/api/endpoints"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { useRouter } from "@/i18n/navigation"
import type { RoleDetailOut } from "@/lib/api/types"

export default function RolesPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.roleView}>
      <RolesPageContent />
    </RequireRoutePermission>
  )
}

function RolesPageContent() {
  const t = useTranslations("roles")
  const router = useRouter()

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: ({ signal }) => rolesApi.list(signal),
  })

  const columns: ColumnDef<RoleDetailOut, unknown>[] = [
    {
      accessorKey: "name_en",
      header: t("columns.name"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {row.original.name_en}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.name_ar}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "code",
      header: t("columns.code"),
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">{row.original.code}</code>
      ),
    },
    {
      accessorKey: "is_system",
      header: t("columns.type"),
      cell: ({ row }) =>
        row.original.is_system ? (
          <Badge variant="outline">{t("systemRole")}</Badge>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "permission_keys",
      header: t("columns.permissions"),
      cell: ({ row }) => row.original.permission_keys.length,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <RequirePermission permission={PERMISSIONS.roleManagePermissions}>
          <CreateRoleDialog />
        </RequirePermission>
      </div>

      <DataTable
        columns={columns}
        data={rolesQuery.data ?? []}
        isLoading={rolesQuery.isLoading}
        isError={rolesQuery.isError}
        error={rolesQuery.error}
        onRetry={() => rolesQuery.refetch()}
        onRowClick={(role) => router.push(`/roles/${role.id}`)}
        emptyTitle={t("noRolesTitle")}
      />
    </div>
  )
}
