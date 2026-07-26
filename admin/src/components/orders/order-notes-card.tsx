"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RequirePermission } from "@/components/permission/require-permission"
import { ordersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { OrderNoteOut } from "@/lib/api/types"

export function OrderNotesCard({
  orderId,
  notes,
}: {
  orderId: number
  notes: OrderNoteOut[]
}) {
  const t = useTranslations("orders")
  const c = useTranslations("common")
  const format = useFormatter()
  const queryClient = useQueryClient()

  const [body, setBody] = useState("")
  const [customerVisible, setCustomerVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAdd() {
    if (!body.trim()) return
    setIsSubmitting(true)
    try {
      await ordersApi.addNote(orderId, {
        body: body.trim(),
        is_customer_visible: customerVisible,
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      })
      toast.success(t("notes.added"))
      setBody("")
      setCustomerVisible(false)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notes.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("notes.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex flex-col gap-1 rounded-lg border border-border p-3"
              >
                <p className="text-sm text-foreground">{note.body}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {format.dateTime(new Date(note.created_at), "long")}
                  </span>
                  <Badge variant={note.is_customer_visible ? "secondary" : "outline"}>
                    {note.is_customer_visible
                      ? t("notes.customerVisible")
                      : t("notes.internal")}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}

        <RequirePermission permission={PERMISSIONS.orderNote}>
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <Input
              placeholder={t("notes.placeholder")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="note-visible"
                  checked={customerVisible}
                  onCheckedChange={(checked) =>
                    setCustomerVisible(checked === true)
                  }
                />
                <Label htmlFor="note-visible" className="font-normal">
                  {t("notes.customerVisible")}
                </Label>
              </div>
              <Button
                size="sm"
                disabled={!body.trim() || isSubmitting}
                onClick={handleAdd}
              >
                {isSubmitting ? c("saving") : t("notes.add")}
              </Button>
            </div>
          </div>
        </RequirePermission>
      </CardContent>
    </Card>
  )
}
