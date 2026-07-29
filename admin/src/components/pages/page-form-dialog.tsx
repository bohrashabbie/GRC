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
import { Textarea } from "@/components/ui/textarea"
import { pagesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type { PageOut, PageStatus, PageTranslationIn } from "@/lib/api/types"

const STATUSES: PageStatus[] = ["draft", "published"]
const LOCALES = ["ar", "en"] as const

type Text = { title: string; slug: string; body: string; meta_title: string; meta_description: string }

function textFrom(page: PageOut, locale: string): Text {
  const row = page.translations.find((t) => t.locale === locale)
  return {
    title: row?.title ?? "",
    slug: row?.slug ?? "",
    body: row?.body ?? "",
    meta_title: row?.meta_title ?? "",
    meta_description: row?.meta_description ?? "",
  }
}

/** Pages are seeded, not staff-created (see CLAUDE.md / cms_service.py) — this
 * dialog only ever edits an existing page's text and publish status. code and
 * template are fixed at seed time and shown read-only for identification. */
export function PageFormDialog({
  page,
  open,
  onOpenChange,
}: {
  page: PageOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("pages")
  const c = useTranslations("common")
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<PageStatus>(page.status)
  const [text, setText] = useState<Record<string, Text>>({
    ar: textFrom(page, "ar"),
    en: textFrom(page, "en"),
  })
  const [saving, setSaving] = useState(false)

  function setField(locale: string, field: keyof Text, value: string) {
    setText((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }))
  }

  async function onSubmit() {
    // Every locale needs a title; the slug is derived from it server-side when
    // left blank, so only the title is genuinely required.
    const missing = LOCALES.filter((l) => !text[l].title.trim())
    if (missing.length > 0) {
      toast.error(t("validation.titleRequired"))
      return
    }

    const translations: PageTranslationIn[] = LOCALES.map((locale) => ({
      locale,
      title: text[locale].title,
      slug: text[locale].slug || null,
      body: text[locale].body || null,
      meta_title: text[locale].meta_title || null,
      meta_description: text[locale].meta_description || null,
    }))

    setSaving(true)
    try {
      await pagesApi.update(page.id, { status, translations })
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages.all })
      toast.success(t("updated"))
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
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.code")}</Label>
              <Input value={page.code} disabled dir="ltr" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("fields.template")}</Label>
              <Input value={t(`templates.${page.template}`)} disabled />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("fields.status")}</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus((v ?? "draft") as PageStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`statuses.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {LOCALES.map((locale) => (
            <div key={locale} className="flex flex-col gap-3 rounded-md border p-3">
              <p className="text-sm font-medium">{t(`locales.${locale}`)}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>{t("fields.pageTitle")}</Label>
                  <Input
                    value={text[locale].title}
                    onChange={(e) => setField(locale, "title", e.target.value)}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("fields.slug")}</Label>
                  <Input
                    value={text[locale].slug}
                    onChange={(e) => setField(locale, "slug", e.target.value)}
                    placeholder={t("fields.slugPlaceholder")}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t("fields.body")}</Label>
                <Textarea
                  rows={8}
                  value={text[locale].body}
                  onChange={(e) => setField(locale, "body", e.target.value)}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>{t("fields.metaTitle")}</Label>
                  <Input
                    value={text[locale].meta_title}
                    onChange={(e) => setField(locale, "meta_title", e.target.value)}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("fields.metaDescription")}</Label>
                  <Input
                    value={text[locale].meta_description}
                    onChange={(e) =>
                      setField(locale, "meta_description", e.target.value)
                    }
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  />
                </div>
              </div>
            </div>
          ))}
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
