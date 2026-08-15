"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { CouponFormDialog } from "@/components/coupons/coupon-form-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { couponsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { useDeletionMessage } from "@/lib/deletion"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { CouponOut } from "@/lib/api/types"

export default function CouponsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.couponView}>
      <CouponsContent />
    </RequireRoutePermission>
  )
}

function CouponsContent() {
  const t = useTranslations("coupons")
  const c = useTranslations("common")
  const del = useTranslations("deletion")
  const format = useFormatter()
  const queryClient = useQueryClient()
  const deletionMessage = useDeletionMessage()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CouponOut | undefined>()
  const [deleting, setDeleting] = useState<CouponOut | null>(null)

  const list = useCursorList<CouponOut>({
    queryKey: queryKeys.coupons.list({ is_active: true }),
    fetchPage: (cursor, signal) =>
      couponsApi.list({ cursor, limit: 20, is_active: true }, signal),
  })

  async function handleDelete(coupon: CouponOut) {
    try {
      const result = await couponsApi.delete(coupon.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all })
      toast.success(deletionMessage(result, coupon.code))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const columns: ColumnDef<CouponOut, unknown>[] = [
    {
      accessorKey: "code",
      header: t("columns.code"),
      cell: ({ row }) => (
        <code className="text-xs font-medium text-foreground">
          {row.original.code}
        </code>
      ),
    },
    {
      id: "discount",
      header: t("columns.discount"),
      cell: ({ row }) =>
        row.original.discount_type === "percent"
          ? `${Number(row.original.value)}%`
          : `${Number(row.original.value).toFixed(3)} KWD`,
    },
    {
      id: "conditions",
      header: t("columns.conditions"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.min_subtotal
            ? t("minSpend", { amount: Number(row.original.min_subtotal).toFixed(3) })
            : "—"}
        </span>
      ),
    },
    {
      id: "usage",
      header: t("columns.usage"),
      cell: ({ row }) =>
        row.original.max_redemptions == null
          ? t("usedUnlimited", { used: row.original.times_redeemed })
          : `${row.original.times_redeemed} / ${row.original.max_redemptions}`,
    },
    {
      id: "window",
      header: t("columns.window"),
      cell: ({ row }) => {
        const { starts_at, ends_at } = row.original
        if (!starts_at && !ends_at) return <span className="text-xs">—</span>
        const fmt = (iso: string) => format.dateTime(new Date(iso), "short")
        return (
          <span className="text-xs text-muted-foreground">
            {starts_at ? fmt(starts_at) : "…"} → {ends_at ? fmt(ends_at) : "…"}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RequirePermission permission={PERMISSIONS.couponManage}>
          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setEditing(row.original)
                setFormOpen(true)
              }}
            >
              {c("edit")}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setDeleting(row.original)}
            >
              {c("delete")}
            </Button>
          </div>
        </RequirePermission>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.couponManage}>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              {t("newCoupon")}
            </Button>
          </RequirePermission>
        }
      />

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />

      {formOpen && (
        <CouponFormDialog
          key={editing?.id ?? "new"}
          coupon={editing}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={del("confirmTitle", { name: deleting.code })}
          description={del("confirmDescription")}
          confirmLabel={c("delete")}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  )
}
