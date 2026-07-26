"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { settingsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type { SettingOut } from "@/lib/api/types"

/**
 * Setting values are arbitrary JSON server-side, so the editor is a raw JSON
 * textarea with parse validation rather than a guessed widget per key.
 */
export function SettingEditDialog({
  setting,
  open,
  onOpenChange,
}: {
  setting: SettingOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const queryClient = useQueryClient()

  const [raw, setRaw] = useState(JSON.stringify(setting.value, null, 2))
  const [isPublic, setIsPublic] = useState(setting.is_public)
  const [parseError, setParseError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function parsed(): { ok: true; value: unknown } | { ok: false } {
    try {
      return { ok: true, value: JSON.parse(raw) }
    } catch {
      return { ok: false }
    }
  }

  function handleAttemptSave() {
    const result = parsed()
    if (!result.ok) {
      setParseError(t("jsonInvalid"))
      return
    }
    setParseError(null)
    setConfirmOpen(true)
  }

  async function handleSave() {
    const result = parsed()
    if (!result.ok) return
    try {
      await settingsApi.update(setting.key, {
        value: result.value as SettingOut["value"],
        is_public: isPublic,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
      toast.success(t("updated"))
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>
              <code className="text-xs">{setting.key}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-value">{t("value")}</Label>
              <textarea
                id="setting-value"
                dir="ltr"
                rows={6}
                spellCheck={false}
                value={raw}
                onChange={(e) => {
                  setRaw(e.target.value)
                  setParseError(null)
                }}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
              <p className="text-xs text-muted-foreground">{t("jsonHint")}</p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="setting-public">{t("public")}</Label>
                <span className="text-xs text-muted-foreground">
                  {t("publicHint")}
                </span>
              </div>
              <Switch
                id="setting-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {parseError && (
              <Alert variant="destructive">
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {c("cancel")}
            </Button>
            <Button onClick={handleAttemptSave}>{c("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive={false}
        title={t("confirmTitle", { key: setting.key })}
        description={t("confirmDescription")}
        confirmLabel={c("save")}
        onConfirm={handleSave}
      />
    </>
  )
}
