"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { menusApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type { MenuOut } from "@/lib/api/types"

export function MenuFormDialog({
  menu,
  open,
  onOpenChange,
}: {
  menu?: MenuOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("menus")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const isEdit = !!menu

  const [code, setCode] = useState(menu?.code ?? "")
  const [isActive, setIsActive] = useState(menu?.is_active ?? true)
  const [saving, setSaving] = useState(false)

  async function onSubmit() {
    if (!code.trim()) {
      toast.error(t("validation.codeRequired"))
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await menusApi.update(menu.id, { code: code.trim(), is_active: isActive })
      } else {
        await menusApi.create({ code: code.trim(), is_active: isActive })
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.menus.all })
      toast.success(isEdit ? t("updated") : t("created"))
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("fields.code")}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="main_nav"
            />
            <p className="text-xs text-muted-foreground">{t("fields.codeHint")}</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label>{t("fields.isActive")}</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {c("cancel")}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving}>
            {saving ? c("saving") : c("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
