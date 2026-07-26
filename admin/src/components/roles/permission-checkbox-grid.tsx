"use client"

import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { sortPermissionGroups } from "@/lib/permissions"
import type { PermissionOut } from "@/lib/api/types"

/** Permissions grouped by category, checkbox per key, select-all/clear per
 * group. Purely presentational — the caller owns the selected Set and what
 * happens on save (diff-and-confirm when editing a role, or a plain create
 * payload when a new role hasn't been saved yet). */
export function PermissionCheckboxGrid({
  permissions,
  selected,
  onChange,
}: {
  permissions: PermissionOut[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const t = useTranslations("roles")
  const g = useTranslations("permissionGroups")

  const byGroup = new Map<string, PermissionOut[]>()
  for (const permission of permissions) {
    const list = byGroup.get(permission.group) ?? []
    list.push(permission)
    byGroup.set(permission.group, list)
  }
  const groups = sortPermissionGroups([...byGroup.keys()])

  function toggle(key: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(key)
    else next.delete(key)
    onChange(next)
  }

  function toggleGroup(groupPermissions: PermissionOut[], allSelected: boolean) {
    const next = new Set(selected)
    for (const p of groupPermissions) {
      if (allSelected) next.delete(p.key)
      else next.add(p.key)
    }
    onChange(next)
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {groups.map((groupKey) => {
        const groupPermissions = byGroup.get(groupKey)!
        const allSelected = groupPermissions.every((p) => selected.has(p.key))

        return (
          <div key={groupKey} className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">
                {g.has(groupKey) ? g(groupKey) : groupKey}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => toggleGroup(groupPermissions, allSelected)}
              >
                {allSelected ? t("clearGroup") : t("selectAll")}
              </Button>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {groupPermissions.map((permission) => (
                <div key={permission.key} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`perm-${permission.key}`}
                    checked={selected.has(permission.key)}
                    onCheckedChange={(checked) =>
                      toggle(permission.key, checked === true)
                    }
                  />
                  <div className="flex flex-col gap-0.5">
                    <Label
                      htmlFor={`perm-${permission.key}`}
                      className="flex items-center gap-1.5 font-normal"
                    >
                      {permission.description ?? permission.key}
                      {permission.is_dangerous && (
                        <Badge variant="destructive" className="h-4 px-1 text-[0.65rem]">
                          {t("dangerous")}
                        </Badge>
                      )}
                    </Label>
                    <code className="text-[0.7rem] text-muted-foreground">
                      {permission.key}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
