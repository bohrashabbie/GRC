"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import { locationsApi, transfersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { bilingualName } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"

export default function TransferDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.stockTransfer}>
      <TransferDetailContent />
    </RequireRoutePermission>
  )
}

function TransferDetailContent() {
  const t = useTranslations("transfers")
  const c = useTranslations("common")
  const locale = useLocale()
  const format = useFormatter()
  const params = useParams<{ id: string }>()
  const transferId = Number(params.id)
  const queryClient = useQueryClient()

  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveQty, setReceiveQty] = useState<Record<number, number>>({})

  const transferQuery = useQuery({
    queryKey: queryKeys.transfers.detail(transferId),
    queryFn: ({ signal }) => transfersApi.get(transferId, signal),
    enabled: Number.isFinite(transferId),
  })

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list({}),
    queryFn: ({ signal }) => locationsApi.list({}, signal),
  })
  const locationName = (id: number) => {
    const location = locationsQuery.data?.items.find((l) => l.id === id)
    return location ? bilingualName(location, locale) : `#${id}`
  }

  const transfer = transferQuery.data

  async function handleDispatch() {
    try {
      // Empty items means "dispatch everything as requested", which is what
      // the backend defaults to.
      await transfersApi.dispatch(transferId, { items: [] })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transfers.detail(transferId),
      })
      toast.success(t("dispatch.done"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  async function handleReceive() {
    if (!transfer) return
    try {
      await transfersApi.receive(transferId, {
        items: transfer.items.map((item) => ({
          item_id: item.id,
          qty_received: receiveQty[item.id] ?? item.qty_dispatched,
        })),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transfers.detail(transferId),
      })
      toast.success(t("receive.done"))
      setReceiveOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/transfers" },
          { label: transfer?.transfer_number ?? t("detailTitle") },
        ]}
      />

      {transferQuery.isLoading && <ListLoadingSkeleton rows={5} />}
      {transferQuery.isError && (
        <ListErrorState
          error={transferQuery.error}
          onRetry={() => transferQuery.refetch()}
        />
      )}

      {transfer && (
        <>
          <PageHeader
            title={transfer.transfer_number}
            description={`${locationName(transfer.from_location_id)} → ${locationName(transfer.to_location_id)}`}
            action={
              <div className="flex items-center gap-2">
                <StatusBadge status={transfer.status} />
                <RequirePermission permission={PERMISSIONS.stockTransfer}>
                  {transfer.dispatched_at === null && (
                    <Button onClick={() => setDispatchOpen(true)}>
                      {t("dispatch.action")}
                    </Button>
                  )}
                  {transfer.dispatched_at !== null &&
                    transfer.received_at === null && (
                      <Button
                        onClick={() => {
                          setReceiveQty(
                            Object.fromEntries(
                              transfer.items.map((i) => [i.id, i.qty_dispatched])
                            )
                          )
                          setReceiveOpen(true)
                        }}
                      >
                        {t("receive.action")}
                      </Button>
                    )}
                </RequirePermission>
              </div>
            }
          />

          {transfer.note && (
            <p className="text-sm text-muted-foreground">{transfer.note}</p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("items.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("items.variant")}</TableHead>
                      <TableHead>{t("items.qtyRequested")}</TableHead>
                      <TableHead>{t("items.qtyDispatched")}</TableHead>
                      <TableHead>{t("items.qtyReceived")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfer.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <code className="text-xs">#{item.variant_id}</code>
                        </TableCell>
                        <TableCell>{item.qty_requested}</TableCell>
                        <TableCell>{item.qty_dispatched}</TableCell>
                        <TableCell>{item.qty_received}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {transfer.dispatched_at && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">
                      {t("dispatch.action")}:
                    </dt>
                    <dd>
                      {format.dateTime(new Date(transfer.dispatched_at), "long")}
                    </dd>
                  </div>
                )}
                {transfer.received_at && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">
                      {t("receive.action")}:
                    </dt>
                    <dd>
                      {format.dateTime(new Date(transfer.received_at), "long")}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        destructive={false}
        title={t("dispatch.title")}
        description={t("dispatch.description")}
        confirmLabel={t("dispatch.action")}
        onConfirm={handleDispatch}
      />

      {transfer && (
        <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("receive.title")}</DialogTitle>
              <DialogDescription>{t("receive.description")}</DialogDescription>
            </DialogHeader>

            <ul className="flex flex-col gap-2">
              {transfer.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <code className="flex-1 text-xs">#{item.variant_id}</code>
                  <span className="text-xs text-muted-foreground">
                    {t("items.qtyDispatched")}: {item.qty_dispatched}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={item.qty_dispatched}
                    dir="ltr"
                    className="w-24"
                    value={receiveQty[item.id] ?? item.qty_dispatched}
                    onChange={(e) =>
                      setReceiveQty((prev) => ({
                        ...prev,
                        [item.id]: Number(e.target.value),
                      }))
                    }
                  />
                </li>
              ))}
            </ul>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiveOpen(false)}>
                {c("cancel")}
              </Button>
              <Button onClick={handleReceive}>{t("receive.action")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
