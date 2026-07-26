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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { menusApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type { MenuItemOut, MenuLinkType, MenuOut } from "@/lib/api/types"

const LINK_TYPES: MenuLinkType[] = ["category", "brand", "collection", "page", "url"]
const NO_PARENT = "__root__"
const LOCALES = ["ar", "en"] as const

export function MenuItemFormDialog({
  menu,
  item,
  open,
  onOpenChange,
}: {
  menu: MenuOut
  item?: MenuItemOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("menus")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const isEdit = !!item

  const [parentId, setParentId] = useState(
    item?.parent_id ? String(item.parent_id) : NO_PARENT
  )
  const [linkType, setLinkType] = useState<MenuLinkType>(item?.link_type ?? "category")
  const [linkTargetId, setLinkTargetId] = useState(
    item?.link_target_id ? String(item.link_target_id) : ""
  )
  const [linkUrl, setLinkUrl] = useState(item?.link_url ?? "")
  const [badge, setBadge] = useState(item?.badge_code ?? "")
  const [sortOrder, setSortOrder] = useState(String(item?.sort_order ?? 0))
  const [isActive, setIsActive] = useState(item?.is_active ?? true)
  const [labels, setLabels] = useState<Record<string, string>>({
    ar: item?.translations.find((tr) => tr.locale === "ar")?.label ?? "",
    en: item?.translations.find((tr) => tr.locale === "en")?.label ?? "",
  })
  const [saving, setSaving] = useState(false)

  // Only top-level entries can be parents; the storefront renders two levels.
  const parentChoices = menu.items.filter(
    (candidate) => candidate.parent_id === null && candidate.id !== item?.id
  )

  function labelOf(candidate: MenuItemOut): string {
    return (
      candidate.translations.find((tr) => tr.locale === "en")?.label ??
      candidate.translations[0]?.label ??
      `#${candidate.id}`
    )
  }

  async function onSubmit() {
    if (LOCALES.some((l) => !labels[l].trim())) {
      toast.error(t("validation.labelRequired"))
      return
    }
    if (linkType === "url" && !linkUrl.trim()) {
      toast.error(t("validation.urlRequired"))
      return
    }
    if (linkType !== "url" && !linkTargetId.trim()) {
      toast.error(t("validation.targetRequired"))
      return
    }

    const payload = {
      parent_id: parentId === NO_PARENT ? null : Number(parentId),
      link_type: linkType,
      link_target_id: linkType === "url" ? null : Number(linkTargetId),
      link_url: linkType === "url" ? linkUrl.trim() : null,
      badge_code: badge.trim() || null,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
      translations: LOCALES.map((locale) => ({ locale, label: labels[locale] })),
    }

    setSaving(true)
    try {
      if (isEdit) {
        await menusApi.updateItem(item.id, payload)
      } else {
        await menusApi.createItem(menu.id, payload)
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.menus.all })
      toast.success(isEdit ? t("itemUpdated") : t("itemCreated"))
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
          <DialogTitle>{isEdit ? t("editItemTitle") : t("newItemTitle")}</DialogTitle>
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

          <div className="flex flex-col gap-2">
            <Label>{t("fields.parent")}</Label>
            <Select
              value={parentId}
              onValueChange={(v) => setParentId(v ?? NO_PARENT)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>{t("fields.topLevel")}</SelectItem>
                {parentChoices.map((candidate) => (
                  <SelectItem key={candidate.id} value={String(candidate.id)}>
                    {labelOf(candidate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.linkType")}</Label>
              <Select
                value={linkType}
                onValueChange={(v) => setLinkType((v ?? "category") as MenuLinkType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPES.map((lt) => (
                    <SelectItem key={lt} value={lt}>
                      {t(`linkTypes.${lt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {linkType === "url" ? (
              <div className="flex flex-col gap-2">
                <Label>{t("fields.linkUrl")}</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/stores"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>{t("fields.linkTargetId")}</Label>
                <Input
                  value={linkTargetId}
                  onChange={(e) => setLinkTargetId(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.badge")}</Label>
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="new"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("fields.sortOrder")}</Label>
              <Input
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                inputMode="numeric"
              />
            </div>
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
