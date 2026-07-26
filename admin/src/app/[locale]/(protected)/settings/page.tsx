"use client"

import { useQuery } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { SettingEditDialog } from "@/components/settings/setting-edit-dialog"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { settingsApi } from "@/lib/api/endpoints"
import { humanizeStatus } from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { SettingOut } from "@/lib/api/types"

export default function SettingsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.settingsView}>
      <SettingsContent />
    </RequireRoutePermission>
  )
}

function SettingsContent() {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const format = useFormatter()
  const [editing, setEditing] = useState<SettingOut | null>(null)

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.list(),
    queryFn: ({ signal }) => settingsApi.list(null, signal),
  })

  // Grouped by the backend's `group` column so related settings sit together.
  const byGroup = new Map<string, SettingOut[]>()
  for (const setting of settingsQuery.data ?? []) {
    const list = byGroup.get(setting.group) ?? []
    list.push(setting)
    byGroup.set(setting.group, list)
  }
  const groups = [...byGroup.keys()].sort()

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      {settingsQuery.isLoading && <ListLoadingSkeleton rows={5} />}
      {settingsQuery.isError && (
        <ListErrorState
          error={settingsQuery.error}
          onRetry={() => settingsQuery.refetch()}
        />
      )}
      {settingsQuery.data && settingsQuery.data.length === 0 && (
        <ListEmptyState description={t("empty")} />
      )}

      {groups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>{humanizeStatus(group)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {byGroup.get(group)!.map((setting) => (
                <li
                  key={setting.key}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <code className="text-xs font-medium text-foreground">
                      {setting.key}
                    </code>
                    <span className="truncate text-xs text-muted-foreground">
                      {JSON.stringify(setting.value)}
                    </span>
                  </div>
                  {setting.is_public && (
                    <Badge variant="outline">{t("public")}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format.dateTime(new Date(setting.updated_at), "short")}
                  </span>
                  <RequirePermission permission={PERMISSIONS.settingsUpdate}>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setEditing(setting)}
                    >
                      {c("edit")}
                    </Button>
                  </RequirePermission>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {editing && (
        <SettingEditDialog
          key={editing.key}
          setting={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  )
}
