"use client"

import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

/**
 * Field-by-field before/after. The backend records only the fields that
 * actually changed, so the union of both objects' keys is exactly the diff —
 * no filtering needed here.
 */
export function AuditDiff({
  before,
  after,
}: {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}) {
  const t = useTranslations("audit")

  const keys = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ].sort()

  if (keys.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {before === null ? t("diff.noBefore") : t("diff.noAfter")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="p-1.5 text-start font-medium">Field</th>
              <th className="p-1.5 text-start font-medium">{t("diff.before")}</th>
              <th className="p-1.5 text-start font-medium">{t("diff.after")}</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const beforeValue = before?.[key]
              const afterValue = after?.[key]
              const changed =
                JSON.stringify(beforeValue) !== JSON.stringify(afterValue)
              return (
                <tr key={key} className="border-t border-border">
                  <td className="p-1.5 font-medium text-foreground">{key}</td>
                  <td className="p-1.5 text-muted-foreground">
                    {renderValue(beforeValue)}
                  </td>
                  <td
                    className={cn(
                      "p-1.5",
                      changed ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {renderValue(afterValue)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[0.7rem] text-muted-foreground">
        {t("diff.changedOnly")}
      </p>
    </div>
  )
}
