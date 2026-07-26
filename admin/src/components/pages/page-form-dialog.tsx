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
import type {
  PageOut,
  PageStatus,
  PageTemplate,
  PageTranslationIn,
} from "@/lib/api/types"

const TEMPLATES: PageTemplate[] = ["default", "full_width", "contact"]
const STATUSES: PageStatus[] = ["draft", "published"]
const LOCALES = ["ar", "en"] as const

type Text = { title: string; slug: string; body: string; meta_title: string; meta_description: string }

function textFrom(page: PageOut | undefined, locale: string): Text {
  const row = page?.translations.find((t) => t.locale === locale)
  return {
    title: row?.title ?? "",
    slug: row?.slug ?? "",
    body: row?.body ?? "",
    meta_title: row?.meta_title ?? "",
    meta_description: row?.meta_description ?? "",
  }
}

export function PageFormDialog({
  page,
  open,
  onOpenChange,
}: {
  page?: PageOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("pages")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const isEdit = !!page

  const [code, setCode] = useState(page?.code ?? "")
  const [template, setTemplate] = useState<PageTemplate>(page?.template ?? "default")
  const [status, setStatus] = useState<PageStatus>(page?.status ?? "draft")
  const [text, setText] = useState<Record<string, Text>>({
    ar: textFrom(page, "ar"),
    en: textFrom(page, "en"),
  })
  const [saving, setSaving] = useState(false)

  function setField(locale: string, field: keyof Text, value: string) {
    setText((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }))
  }

  async function onSubmit() {
    if (!code.trim()) {
      toast.error(t("validation.codeRequired"))
      return
    }
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
      const payload = { code: code.trim(), template, status, translations }
      if (isEdit) {
        await pagesApi.update(page.id, payload)
      } else {
        await pagesApi.create(payload)
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages.all })
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.code")}</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="returns_policy"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("fields.template")}</Label>
              <Select
                value={template}
                onValueChange={(v) => setTemplate((v ?? "default") as PageTemplate)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((tpl) => (
                    <SelectItem key={tpl} value={tpl}>
                      {t(`templates.${tpl}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
