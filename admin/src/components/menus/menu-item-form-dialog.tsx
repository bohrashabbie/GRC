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
import type { MenuItemOut } from "@/lib/api/types"

const LOCALES = ["ar", "en"] as const

/** Menu items are seeded, not staff-created (see CLAUDE.md / cms_service.py)
 * — this dialog only ever edits an existing item's label text and whether
 * it's shown, never where it links or its place in the menu. */
export function MenuItemFormDialog({
  item,
  open,
  onOpenChange,
}: {
  item: MenuItemOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("menus")
  const c = useTranslations("common")
  const queryClient = useQueryClient()

  const [isActive, setIsActive] = useState(item.is_active)
  const [labels, setLabels] = useState<Record<string, string>>({
    ar: item.translations.find((tr) => tr.locale === "ar")?.label ?? "",
    en: item.translations.find((tr) => tr.locale === "en")?.label ?? "",
  })
  const [saving, setSaving] = useState(false)

  async function onSubmit() {
    if (LOCALES.some((l) => !labels[l].trim())) {
      toast.error(t("validation.labelRequired"))
      return
    }

    setSaving(true)
    try {
      await menusApi.updateItem(item.id, {
        is_active: isActive,
        translations: LOCALES.map((locale) => ({ locale, label: labels[locale] })),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.menus.all })
      toast.success(t("itemUpdated"))
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editItemTitle")}</DialogTitle>
          <DialogDescription>{t("itemFormDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {LOCALES.map((locale) => (
            <div key={locale} className="flex flex-col gap-2">
              <Label>{t(`fields.label.${locale}`)}</Label>
              <Input
                value={labels[locale]}
                onChange={(e) =>
                  setLabels((prev) => ({ ...prev, [locale]: e.target.value }))
                }
                dir={locale === "ar" ? "rtl" : "ltr"}
              />
            </div>
          ))}

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
