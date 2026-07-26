"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { DataTable } from "@/components/data-table"
import { CreateUserDialog } from "@/components/users/create-user-dialog"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { RequirePermission } from "@/components/permission/require-permission"
import { useCursorList } from "@/hooks/use-cursor-list"
import { useQueryParam } from "@/hooks/use-query-param"
import { usersApi } from "@/lib/api/endpoints"
import { queryKeys } from "@/lib/query/keys"
import { PERMISSIONS } from "@/lib/permissions"
import { useRouter } from "@/i18n/navigation"
import type { UserOut } from "@/lib/api/types"

type StatusFilter = "all" | "active" | "inactive"

function toIsActive(status: StatusFilter): boolean | undefined {
  if (status === "active") return true
  if (status === "inactive") return false
  return undefined
}

export default function UsersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.userView}>
      <UsersPageContent />
    </RequireRoutePermission>
  )
}

function UsersPageContent() {
  const t = useTranslations("users")
  const c = useTranslations("common")
  const format = useFormatter()
  const router = useRouter()

  const [statusParam, setStatusParam] = useQueryParam("status")
  const status = (statusParam as StatusFilter) ?? "all"
  const isActive = toIsActive(status)

  const { items, isLoading, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useCursorList<UserOut>({
      queryKey: queryKeys.users.list({ is_active: isActive }),
      fetchPage: (cursor, signal) =>
        usersApi.list({ cursor, limit: 20, is_active: isActive }, signal),
    })

  const columns: ColumnDef<UserOut, unknown>[] = [
    {
      accessorKey: "full_name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.full_name}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: t("columns.email"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "phone_e164",
      header: t("columns.phone"),
      cell: ({ row }) => row.original.phone_e164 ?? "—",
    },
    {
      accessorKey: "is_active",
      header: t("columns.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? c("active") : c("inactive")}
        </Badge>
      ),
    },
    {
      accessorKey: "last_login_at",
      header: t("columns.lastLogin"),
      cell: ({ row }) =>
        row.original.last_login_at
          ? format.dateTime(new Date(row.original.last_login_at), "long")
          : c("never"),
    },
    {
      accessorKey: "created_at",
      header: t("columns.created"),
      cell: ({ row }) =>
        format.dateTime(new Date(row.original.created_at), "short"),
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
        <RequirePermission permission={PERMISSIONS.userCreate}>
          <CreateUserDialog />
        </RequirePermission>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) =>
            setStatusParam(value === "all" ? null : (value as string))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{c("all")}</SelectItem>
            <SelectItem value="active">{c("active")}</SelectItem>
            <SelectItem value="inactive">{c("inactive")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{t("noSearchHint")}</span>
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        onRowClick={(user) => router.push(`/users/${user.id}`)}
        emptyDescription={t("empty")}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />
    </div>
  )
}
