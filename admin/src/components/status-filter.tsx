"use client"

import { useTranslations } from "next-intl"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQueryParam } from "@/hooks/use-query-param"

export type StatusFilterValue = "all" | "active" | "inactive"

/**
 * Active/inactive filter bound to the URL, so a filtered list stays
 * bookmarkable and shareable internally.
 */
export function useStatusFilter(paramName = "status") {
  const [raw, setRaw] = useQueryParam(paramName)
  const status = (raw as StatusFilterValue) ?? "all"

  return {
    status,
    setStatus: (next: StatusFilterValue) =>
      setRaw(next === "all" ? null : next),
    isActive:
      status === "active" ? true : status === "inactive" ? false : undefined,
  }
}

export function StatusFilter({
  value,
  onChange,
  hint,
}: {
  value: StatusFilterValue
  onChange: (next: StatusFilterValue) => void
  hint?: string
}) {
  const c = useTranslations("common")

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value}
        onValueChange={(next) => onChange((next as StatusFilterValue) ?? "all")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder={c("status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{c("all")}</SelectItem>
          <SelectItem value="active">{c("active")}</SelectItem>
          <SelectItem value="inactive">{c("inactive")}</SelectItem>
        </SelectContent>
      </Select>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}
