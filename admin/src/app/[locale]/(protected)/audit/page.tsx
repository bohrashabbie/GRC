"use client"

import { ChevronRight } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { AuditDiff } from "@/components/audit/audit-diff"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { useCursorList } from "@/hooks/use-cursor-list"
import { useQueryParam } from "@/hooks/use-query-param"
import { auditApi } from "@/lib/api/endpoints"
import { humanizeStatus } from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { AuditLogOut } from "@/lib/api/types"

export default function AuditPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.auditView}>
      <AuditContent />
    </RequireRoutePermission>
  )
}

function AuditContent() {
  const t = useTranslations("audit")
  const c = useTranslations("common")
  const format = useFormatter()

  const [entityParam, setEntityParam] = useQueryParam("entity")
  const [actionParam, setActionParam] = useQueryParam("action")
  const [actorParam, setActorParam] = useQueryParam("actor")
  const [fromParam, setFromParam] = useQueryParam("from")
  const [toParam, setToParam] = useQueryParam("to")

  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const list = useCursorList<AuditLogOut>({
    queryKey: queryKeys.audit.list({
      entity_type: entityParam,
      action: actionParam,
      actor_user_id: actorParam ? Number(actorParam) : null,
      date_from: fromParam,
      date_to: toParam,
    }),
    fetchPage: (cursor, signal) =>
      auditApi.list(
        {
          cursor,
          limit: 25,
          entity_type: entityParam,
          action: actionParam,
          actor_user_id: actorParam ? Number(actorParam) : null,
          date_from: fromParam,
          date_to: toParam,
        },
        signal
      ),
  })

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearFilters() {
    setEntityParam(null)
    setActionParam(null)
    setActorParam(null)
    setFromParam(null)
    setToParam(null)
  }

  const hasFilters =
    !!entityParam || !!actionParam || !!actorParam || !!fromParam || !!toParam

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-entity">{t("filters.entityType")}</Label>
          <Input
            id="audit-entity"
            dir="ltr"
            className="w-40"
            placeholder="order"
            value={entityParam ?? ""}
            onChange={(e) => setEntityParam(e.target.value || null)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-action">{t("filters.action")}</Label>
          <Input
            id="audit-action"
            dir="ltr"
            className="w-44"
            placeholder="order.refund"
            value={actionParam ?? ""}
            onChange={(e) => setActionParam(e.target.value || null)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-actor">{t("filters.actor")}</Label>
          <Input
            id="audit-actor"
            dir="ltr"
            inputMode="numeric"
            className="w-28"
            value={actorParam ?? ""}
            onChange={(e) => setActorParam(e.target.value || null)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-from">{t("filters.dateFrom")}</Label>
          <Input
            id="audit-from"
            type="date"
            dir="ltr"
            value={fromParam ?? ""}
            onChange={(e) => setFromParam(e.target.value || null)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-to">{t("filters.dateTo")}</Label>
          <Input
            id="audit-to"
            type="date"
            dir="ltr"
            value={toParam ?? ""}
            onChange={(e) => setToParam(e.target.value || null)}
          />
        </div>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            {c("clearFilters")}
          </Button>
        )}
      </div>

      {list.isLoading && <ListLoadingSkeleton rows={8} />}
      {list.isError && (
        <ListErrorState error={list.error} onRetry={() => list.refetch()} />
      )}
      {!list.isLoading && !list.isError && list.items.length === 0 && (
        <ListEmptyState description={t("empty")} />
      )}

      {list.items.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1.5">
            {list.items.map((entry) => {
              const isOpen = expanded.has(entry.id)
              return (
                <li
                  key={entry.id}
                  className="rounded-lg border border-border"
                >
                  <button
                    type="button"
                    onClick={() => toggle(entry.id)}
                    aria-expanded={isOpen}
                    className="flex w-full flex-wrap items-center gap-3 p-3 text-start hover:bg-muted/50"
                  >
                    <ChevronRight
                      aria-hidden
                      className={`size-3.5 shrink-0 text-muted-foreground transition-transform rtl:-scale-x-100 ${
                        isOpen ? "rotate-90 rtl:-rotate-90" : ""
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {format.dateTime(new Date(entry.created_at), "long")}
                    </span>
                    <Badge variant="outline">{entry.action}</Badge>
                    <span className="text-sm">
                      {humanizeStatus(entry.entity_type)}
                      {entry.entity_id !== null && (
                        <span className="text-muted-foreground">
                          {" "}
                          #{entry.entity_id}
                        </span>
                      )}
                    </span>
                    <span className="ms-auto text-xs text-muted-foreground">
                      {entry.actor_user_id === null
                        ? t("system")
                        : `${t("columns.actor")} #${entry.actor_user_id}`}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border p-3">
                      <AuditDiff
                        before={entry.before_json}
                        after={entry.after_json}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="flex justify-center py-1">
            {list.hasNextPage ? (
              <Button
                variant="outline"
                size="sm"
                disabled={list.isFetchingNextPage}
                onClick={() => list.fetchNextPage()}
              >
                {list.isFetchingNextPage ? c("loading") : c("loadMore")}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {c("allLoaded")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
