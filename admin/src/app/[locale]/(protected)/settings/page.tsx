"use client"

import { useQuery } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { ContactDetailsCard } from "@/components/settings/contact-details-card"
import { RowActions } from "@/components/row-actions"
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

const CONTACT_GROUP = "contact"

function SettingsContent() {
  const t = useTranslations("settings")
  const cm = useTranslations("common")
  const format = useFormatter()
  const [editing, setEditing] = useState<SettingOut | null>(null)

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.list(),
    queryFn: ({ signal }) => settingsApi.list(null, signal),
  })

  // Grouped by the backend's `group` column so related settings sit together.
  // The contact group is left out: it has a proper form above rather than a
  // row of raw JSON, and showing both invites editing the same key twice.
  const byGroup = new Map<string, SettingOut[]>()
  for (const setting of settingsQuery.data ?? []) {
    if (setting.group === CONTACT_GROUP) continue
    const list = byGroup.get(setting.group) ?? []
    list.push(setting)
    byGroup.set(setting.group, list)
  }
  const groups = [...byGroup.keys()].sort()

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      <ContactDetailsCard />

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
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("key")}</TableHead>
                    <TableHead>{t("value")}</TableHead>
                    <TableHead>{t("public")}</TableHead>
                    <TableHead>{t("updatedAt")}</TableHead>
                    <TableHead className="w-px">{cm("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byGroup.get(group)!.map((setting) => (
                    <TableRow key={setting.key} className="even:bg-muted/30">
                      <TableCell className="font-medium text-foreground">
                        {setting.key}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {JSON.stringify(setting.value)}
                      </TableCell>
                      <TableCell>
                        {setting.is_public ? (
                          <Badge variant="outline">{t("public")}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format.dateTime(new Date(setting.updated_at), "short")}
                      </TableCell>
                      <TableCell className="w-px whitespace-nowrap">
                        <RequirePermission permission={PERMISSIONS.settingsUpdate}>
                          <RowActions onEdit={() => setEditing(setting)} />
                        </RequirePermission>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
