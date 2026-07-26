"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { ordersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { humanizeStatus, nextOrderStatuses } from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { OrderOut, OrderStatusField } from "@/lib/api/types"

type PendingChange = { field: OrderStatusField; value: string } | null

/**
 * Only transitions that are actually legal from the current status are
 * offered — the valid moves are mirrored from the backend's transition
 * tables, and the API still validates on submit.
 */
export function OrderStatusCard({ order }: { order: OrderOut }) {
  const t = useTranslations("orders")
  const c = useTranslations("common")
  const queryClient = useQueryClient()

  const [pending, setPending] = useState<PendingChange>(null)
  const [reason, setReason] = useState("")

  async function applyChange(change: NonNullable<PendingChange>) {
    try {
      await ordersApi.updateStatus(order.id, {
        field: change.field,
        to_value: change.value,
        reason: reason.trim() || null,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      toast.success(t("status.updated"))
      setReason("")
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const rows: { field: OrderStatusField; label: string; current: string }[] = [
    { field: "status", label: t("status.orderStatus"), current: order.status },
    {
      field: "payment_status",
      label: t("status.paymentStatus"),
      current: order.payment_status,
    },
    {
      field: "fulfilment_status",
      label: t("status.fulfilmentStatus"),
      current: order.fulfilment_status,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("status.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map((row) => {
          const options = nextOrderStatuses(row.field, row.current)
          return (
            <div key={row.field} className="flex flex-col gap-1.5">
              <Label>{row.label}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={row.current} />
                <RequirePermission permission={PERMISSIONS.orderUpdateStatus}>
                  {options.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t("status.noTransitions")}
                    </span>
                  ) : (
                    <Select
                      value=""
                      onValueChange={(next) =>
                        next && setPending({ field: row.field, value: next })
                      }
                    >
                      <SelectTrigger size="sm" className="w-44">
                        <SelectValue placeholder={t("status.changeTo")} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {humanizeStatus(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </RequirePermission>
              </div>
            </div>
          )
        })}

        <RequirePermission permission={PERMISSIONS.orderUpdateStatus}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status-reason">{t("status.reason")}</Label>
            <Input
              id="status-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </RequirePermission>
      </CardContent>

      {pending && (
        <ConfirmDialog
          open={pending !== null}
          onOpenChange={(open) => !open && setPending(null)}
          destructive={pending.value === "cancelled"}
          title={t("status.confirmTitle", {
            field: pending.field.replace(/_/g, " "),
            value: humanizeStatus(pending.value),
          })}
          description={t("status.confirmDescription")}
          onConfirm={() => applyChange(pending)}
        />
      )}
    </Card>
  )
}
