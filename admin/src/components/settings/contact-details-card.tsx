"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RequirePermission } from "@/components/permission/require-permission"
import { settingsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { SettingOut } from "@/lib/api/types"

/**
 * The storefront's contact details, as a form rather than raw JSON.
 *
 * These are ordinary settings — the same rows the list below edits — but they
 * are the ones staff actually change, and asking someone to type
 * `"info@gr8trend.com"` with the quotes into a JSON box to correct an email
 * address is how it stays wrong. Each field writes one key, flagged public so
 * the storefront can read it, in the "contact" group.
 */

/** field name → the settings key it writes. Order is the form's order. */
const FIELDS = {
  email: "contact.email",
  phone: "contact.phone",
  whatsapp: "contact.whatsapp",
  address_ar: "contact.address_ar",
  address_en: "contact.address_en",
  hours_ar: "contact.hours_ar",
  hours_en: "contact.hours_en",
  facebook: "social.facebook",
  instagram: "social.instagram",
  tiktok: "social.tiktok",
  youtube: "social.youtube",
  snapchat: "social.snapchat",
} as const

type FieldName = keyof typeof FIELDS

const SOCIAL_FIELDS: FieldName[] = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "snapchat",
]

function useContactSchema() {
  const t = useTranslations("settings")
  const v = useTranslations("validation")
  const url = z
    .string()
    .url(t("contact.urlInvalid"))
    .or(z.literal(""))
  return z.object({
    email: z.string().email(v("emailInvalid")).or(z.literal("")),
    // Display form, so spaces and + are fine — it is shown, not dialled by a
    // machine.
    phone: z.string(),
    // wa.me takes digits only; anything else silently opens a broken chat.
    whatsapp: z
      .string()
      .regex(/^\d{8,15}$/, t("contact.whatsappDigits"))
      .or(z.literal("")),
    address_ar: z.string(),
    address_en: z.string(),
    hours_ar: z.string(),
    hours_en: z.string(),
    facebook: url,
    instagram: url,
    tiktok: url,
    youtube: url,
    snapchat: url,
  })
}

type FormValues = z.infer<ReturnType<typeof useContactSchema>>

/** Settings hold free-form JSON; only a string is usable as a contact detail. */
function asText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function toForm(settings: SettingOut[]): FormValues {
  const byKey = new Map(settings.map((row) => [row.key, row.value]))
  return Object.fromEntries(
    Object.entries(FIELDS).map(([field, key]) => [field, asText(byKey.get(key))])
  ) as FormValues
}

export function ContactDetailsCard() {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const schema = useContactSchema()

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.list(null),
    queryFn: ({ signal }) => settingsApi.list(null, signal),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toForm([]),
  })

  // The form is filled from the server once the settings arrive, and again
  // after a save, so a key created by this form shows its stored value rather
  // than the blank it started as.
  const { reset } = form
  const settings = settingsQuery.data
  useEffect(() => {
    if (settings) reset(toForm(settings))
  }, [settings, reset])

  async function onSubmit(values: FormValues) {
    const current = toForm(settingsQuery.data ?? [])
    const changed = (Object.keys(FIELDS) as FieldName[]).filter(
      (field) => values[field].trim() !== current[field].trim()
    )
    if (changed.length === 0) {
      toast.success(t("contact.noChanges"))
      return
    }

    try {
      for (const field of changed) {
        await settingsApi.update(FIELDS[field], {
          value: values[field].trim(),
          group: "contact",
          // The storefront reads these, so they have to be public. Nothing
          // secret goes in this form.
          is_public: true,
        })
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
      toast.success(t("contact.saved", { count: changed.length }))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  function textField(field: FieldName, label: string, hint?: string, dir?: "ltr") {
    return (
      <FormField
        key={field}
        control={form.control}
        name={field}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input dir={dir} {...f} />
            </FormControl>
            {hint && <FormDescription>{hint}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("contact.title")}</CardTitle>
        <CardDescription>{t("contact.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("email", t("contact.email"), undefined, "ltr")}
              {textField("phone", t("contact.phone"), t("contact.phoneHint"), "ltr")}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {textField(
                "whatsapp",
                t("contact.whatsapp"),
                t("contact.whatsappHint"),
                "ltr"
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {textField("address_ar", t("contact.addressAr"))}
              {textField("address_en", t("contact.addressEn"))}
              {textField("hours_ar", t("contact.hoursAr"))}
              {textField("hours_en", t("contact.hoursEn"))}
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">{t("contact.socialTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {t("contact.socialHint")}
              </p>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                {SOCIAL_FIELDS.map((field) =>
                  textField(field, t(`contact.${field}`), undefined, "ltr")
                )}
              </div>
            </div>

            <RequirePermission permission={PERMISSIONS.settingsUpdate}>
              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? c("saving") : c("save")}
                </Button>
              </div>
            </RequirePermission>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
