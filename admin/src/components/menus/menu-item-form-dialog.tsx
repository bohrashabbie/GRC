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
import type { MenuItemOut } from "@/lib/api/types"

const LOCALES = ["ar", "en"] as const

/** Mirrors MENU_ITEM_LINK_TYPES in the API. */
const LINK_TYPES = ["url", "category", "product", "page"] as const
type LinkType = (typeof LINK_TYPES)[number]

const NO_PARENT = "__none__"

export function MenuItemFormDialog({
  menuId,
  item,
  siblings,
  open,
  onOpenChange,
}: {
  /** Which menu a newly created item belongs to. */
  menuId: number
  /** Undefined = create mode. */
  item?: MenuItemOut
  /** Candidate parents — the menu's existing items, minus this one. */
  siblings: MenuItemOut[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("menus")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const isEdit = !!item

  const [isActive, setIsActive] = useState(item?.is_active ?? true)
  const [linkType, setLinkType] = useState<LinkType>(
    (item?.link_type as LinkType) ?? "url"
  )
  const [linkUrl, setLinkUrl] = useState(item?.link_url ?? "")
  const [linkTargetId, setLinkTargetId] = useState(
    item?.link_target_id != null ? String(item.link_target_id) : ""
  )
  const [parentId, setParentId] = useState(
    item?.parent_id != null ? String(item.parent_id) : NO_PARENT
  )
  const [sortOrder, setSortOrder] = useState(String(item?.sort_order ?? 0))
  const [labels, setLabels] = useState<Record<string, string>>({
    ar: item?.translations.find((tr) => tr.locale === "ar")?.label ?? "",
    en: item?.translations.find((tr) => tr.locale === "en")?.label ?? "",
  })
  const [saving, setSaving] = useState(false)

  // A raw URL and a typed reference are mutually exclusive, matching the API's
  // _check_link — so only one of the two inputs is ever shown.
  const needsUrl = linkType === "url"

  async function onSubmit() {
    if (LOCALES.some((l) => !labels[l].trim())) {
      toast.error(t("validation.labelRequired"))
      return
    }
    if (needsUrl && !linkUrl.trim()) {
      toast.error(t("validation.linkUrlRequired"))
      return
    }
    if (!needsUrl && !linkTargetId.trim()) {
      toast.error(t("validation.linkTargetRequired"))
      return
    }

    const payload = {
      parent_id: parentId === NO_PARENT ? null : Number(parentId),
      link_type: linkType,
      link_url: needsUrl ? linkUrl.trim() : null,
      link_target_id: needsUrl ? null : Number(linkTargetId),
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
      translations: LOCALES.map((locale) => ({ locale, label: labels[locale] })),
    }

    setSaving(true)
    try {
      if (isEdit) {
        await menusApi.updateItem(item.id, payload)
      } else {
        await menusApi.createItem(menuId, payload)
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
          <DialogTitle>
            {isEdit ? t("editItemTitle") : t("newItemTitle")}
          </DialogTitle>
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
            <Label>{t("fields.linkType")}</Label>
            <Select
              value={linkType}
              onValueChange={(v) => setLinkType((v as LinkType) ?? "url")}
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

          {needsUrl ? (
            <div className="flex flex-col gap-2">
              <Label>{t("fields.linkUrl")}</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                dir="ltr"
                placeholder="/collections/new"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>{t("fields.linkTargetId")}</Label>
              <Input
                value={linkTargetId}
                onChange={(e) => setLinkTargetId(e.target.value)}
                dir="ltr"
                inputMode="numeric"
              />
              <span className="text-xs text-muted-foreground">
                {t("hints.linkTargetId")}
              </span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
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
                  <SelectItem value={NO_PARENT}>{t("topLevel")}</SelectItem>
                  {siblings
                    .filter((s) => s.id !== item?.id)
                    .map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.translations.find((tr) => tr.locale === "en")?.label ??
                          s.translations[0]?.label ??
                          `#${s.id}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("fields.sortOrder")}</Label>
              <Input
                type="number"
                dir="ltr"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
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
            {saving ? c("saving") : isEdit ? c("save") : c("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
