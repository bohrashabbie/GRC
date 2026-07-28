"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { MediaPicker } from "@/components/media/media-picker"
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
import { bannersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type {
  BannerLinkType,
  BannerOut,
  BannerPlacement,
  BannerTranslationIn,
} from "@/lib/api/types"

const PLACEMENTS: BannerPlacement[] = [
  "home_hero",
  "home_promo",
  "category_top",
  "checkout_strip",
]
const LINK_TYPES: BannerLinkType[] = ["category", "product", "collection", "url"]
const NO_LINK = "__none__"
const LOCALES = ["ar", "en"] as const

type TextFields = { headline: string; subheadline: string; cta_label: string; alt_text: string }

function emptyText(): TextFields {
  return { headline: "", subheadline: "", cta_label: "", alt_text: "" }
}

function textFrom(banner: BannerOut | undefined, locale: string): TextFields {
  const row = banner?.translations.find((t) => t.locale === locale)
  return {
    headline: row?.headline ?? "",
    subheadline: row?.subheadline ?? "",
    cta_label: row?.cta_label ?? "",
    alt_text: row?.alt_text ?? "",
  }
}

/** datetime-local wants `YYYY-MM-DDTHH:mm`; the API sends full ISO. */
function toLocalInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : ""
}

export function BannerFormDialog({
  banner,
  open,
  onOpenChange,
}: {
  banner?: BannerOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("banners")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const isEdit = !!banner

  const [placement, setPlacement] = useState<BannerPlacement>(
    banner?.placement ?? "home_hero"
  )
  const [textTheme, setTextTheme] = useState<"light" | "dark">(
    banner?.text_theme ?? "dark"
  )
  const [sortOrder, setSortOrder] = useState(String(banner?.sort_order ?? 0))
  const [isActive, setIsActive] = useState(banner?.is_active ?? true)
  const [startsAt, setStartsAt] = useState(toLocalInput(banner?.starts_at ?? null))
  const [endsAt, setEndsAt] = useState(toLocalInput(banner?.ends_at ?? null))

  const [linkType, setLinkType] = useState<string>(banner?.link_type ?? NO_LINK)
  const [linkUrl, setLinkUrl] = useState(banner?.link_url ?? "")
  const [linkTargetId, setLinkTargetId] = useState(
    banner?.link_target_id ? String(banner.link_target_id) : ""
  )

  const [desktopId, setDesktopId] = useState<number | null>(
    banner?.media_desktop_id ?? null
  )
  const [mobileId, setMobileId] = useState<number | null>(
    banner?.media_mobile_id ?? null
  )
  // The API resolves these alongside the ids. Holding only the id is what made
  // a banner with artwork render as "No image set".
  const [desktopKey, setDesktopKey] = useState<string | null>(
    banner?.media_desktop_key ?? null
  )
  const [mobileKey, setMobileKey] = useState<string | null>(
    banner?.media_mobile_key ?? null
  )

  const [text, setText] = useState<Record<string, TextFields>>({
    ar: banner ? textFrom(banner, "ar") : emptyText(),
    en: banner ? textFrom(banner, "en") : emptyText(),
  })
  const [saving, setSaving] = useState(false)

  function setField(locale: string, field: keyof TextFields, value: string) {
    setText((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }))
  }

  async function onSubmit() {
    // A banner with no artwork is skipped by the storefront, so catch it here
    // rather than letting it save into a state that renders nothing.
    if (!desktopId) {
      toast.error(t("validation.desktopRequired"))
      return
    }

    const translations: BannerTranslationIn[] = LOCALES.map((locale) => ({
      locale,
      headline: text[locale].headline || null,
      subheadline: text[locale].subheadline || null,
      cta_label: text[locale].cta_label || null,
      alt_text: text[locale].alt_text || null,
    }))

    const payload = {
      placement,
      media_desktop_id: desktopId,
      media_mobile_id: mobileId,
      link_type: linkType === NO_LINK ? null : (linkType as BannerLinkType),
      link_target_id:
        linkType === NO_LINK || linkType === "url" || !linkTargetId
          ? null
          : Number(linkTargetId),
      link_url: linkType === "url" ? linkUrl || null : null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
      text_theme: textTheme,
      translations,
    }

    setSaving(true)
    try {
      if (isEdit) {
        await bannersApi.update(banner.id, payload)
      } else {
        await bannersApi.create(payload)
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.banners.all })
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.placement")}</Label>
              <Select
                value={placement}
                onValueChange={(v) => setPlacement(v as BannerPlacement)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLACEMENTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`placements.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t("fields.textTheme")}</Label>
              <Select
                value={textTheme}
                onValueChange={(v) => setTextTheme(v as "light" | "dark")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">{t("themes.dark")}</SelectItem>
                  <SelectItem value="light">{t("themes.light")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MediaPicker
              value={desktopId}
              storageKey={desktopKey}
              onChange={(id, key) => {
                setDesktopId(id)
                setDesktopKey(key)
              }}
              label={t("fields.desktopImage")}
              hint={t("fields.desktopHint")}
            />
            <MediaPicker
              value={mobileId}
              storageKey={mobileKey}
              onChange={(id, key) => {
                setMobileId(id)
                setMobileKey(key)
              }}
              label={t("fields.mobileImage")}
              hint={t("fields.mobileHint")}
            />
          </div>

          {LOCALES.map((locale) => (
            <div key={locale} className="flex flex-col gap-3 rounded-md border p-3">
              <p className="text-sm font-medium">{t(`locales.${locale}`)}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>{t("fields.headline")}</Label>
                  <Input
                    value={text[locale].headline}
                    onChange={(e) => setField(locale, "headline", e.target.value)}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("fields.subheadline")}</Label>
                  <Input
                    value={text[locale].subheadline}
                    onChange={(e) => setField(locale, "subheadline", e.target.value)}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("fields.ctaLabel")}</Label>
                  <Input
                    value={text[locale].cta_label}
                    onChange={(e) => setField(locale, "cta_label", e.target.value)}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("fields.altText")}</Label>
                  <Input
                    value={text[locale].alt_text}
                    onChange={(e) => setField(locale, "alt_text", e.target.value)}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.linkType")}</Label>
              <Select value={linkType} onValueChange={(v) => setLinkType(v ?? NO_LINK)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LINK}>{t("fields.noLink")}</SelectItem>
                  {LINK_TYPES.map((lt) => (
                    <SelectItem key={lt} value={lt}>
                      {t(`linkTypes.${lt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {linkType === "url" && (
              <div className="flex flex-col gap-2">
                <Label>{t("fields.linkUrl")}</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/c/thobes-winter"
                />
              </div>
            )}

            {linkType !== NO_LINK && linkType !== "url" && (
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
              <Label>{t("fields.startsAt")}</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("fields.endsAt")}</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.sortOrder")}</Label>
              <Input
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="flex items-center justify-between gap-3 pt-6">
              <Label>{t("fields.isActive")}</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
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
