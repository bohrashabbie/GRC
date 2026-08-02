"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/status-badge"
import { usePermission } from "@/hooks/use-permission"
import { contactMessagesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { ContactMessageOut, ContactMessageStatus } from "@/lib/api/types"

/**
 * Read view of one inbox message. Opening a `new` message marks it `read`
 * automatically (inbox semantics — seeing it is reading it); `closed` is the
 * explicit archive action, and a closed message can be reopened.
 */
export function ContactMessageDialog({
  message,
  open,
  onOpenChange,
}: {
  message: ContactMessageOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("contactMessages")
  const c = useTranslations("common")
  const format = useFormatter()
  const queryClient = useQueryClient()
  const canManage = usePermission(PERMISSIONS.contactManage)

  const [status, setStatus] = useState<ContactMessageStatus>(message.status)
  const [saving, setSaving] = useState(false)
  const autoRead = useRef(false)

  async function changeStatus(next: ContactMessageStatus, { silent = false } = {}) {
    setSaving(true)
    try {
      await contactMessagesApi.updateStatus(message.id, { status: next })
      setStatus(next)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.contactMessages.all,
      })
      if (!silent) toast.success(t("updated"))
    } catch (error) {
      if (!silent) toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (open && canManage && status === "new" && !autoRead.current) {
      autoRead.current = true
      void changeStatus("read", { silent: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canManage])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {message.subject || t("noSubject")}
            <StatusBadge status={status} label={t(`statuses.${status}`)} />
          </DialogTitle>
          <DialogDescription>
            {format.dateTime(new Date(message.created_at), "long")}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">{t("fields.name")}</dt>
            <dd className="mt-0.5 font-medium">{message.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("fields.email")}</dt>
            <dd className="mt-0.5" dir="ltr">
              <a href={`mailto:${message.email}`} className="underline underline-offset-2">
                {message.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("fields.phone")}</dt>
            <dd className="mt-0.5" dir="ltr">
              {message.phone ? (
                <a href={`tel:${message.phone}`} className="underline underline-offset-2">
                  {message.phone}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("fields.locale")}</dt>
            <dd className="mt-0.5">{t(`locales.${message.locale}`)}</dd>
          </div>
        </dl>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.message}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {c("close")}
          </Button>
          {canManage && status !== "closed" && (
            <Button disabled={saving} onClick={() => changeStatus("closed")}>
              {t("closeMessage")}
            </Button>
          )}
          {canManage && status === "closed" && (
            <Button disabled={saving} onClick={() => changeStatus("read")}>
              {t("reopen")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
