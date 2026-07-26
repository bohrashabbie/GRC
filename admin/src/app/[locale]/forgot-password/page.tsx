"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, MailCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { BrandLogo } from "@/components/layout/brand-logo"
import { getErrorMessage } from "@/lib/api/error-message"
import { Link } from "@/i18n/navigation"
import { API_BASE_URL } from "@/lib/api/client"

function useForgotSchema() {
  const v = useTranslations("validation")
  return z.object({
    email: z.string().min(1, v("emailRequired")).email(v("emailInvalid")),
  })
}

type FormValues = { email: string }

export default function ForgotPasswordPage() {
  const t = useTranslations("auth")
  const c = useTranslations("common")
  const schema = useForgotSchema()
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      // Unauthenticated endpoint, so it's called directly rather than through
      // the bearer-token client.
      const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      })
      if (!response.ok && response.status !== 202) {
        throw new Error(`Request failed (${response.status})`)
      }
      // The API always returns 202 whether or not the address exists, so the
      // UI must not reveal it either.
      setSent(true)
    } catch (error) {
      setFormError(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <BrandLogo size="lg" />
          <h1 className="text-xl font-semibold text-foreground">
            {t("forgotTitle")}
          </h1>
          <p className="text-muted-foreground">{t("forgotSubtitle")}</p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MailCheck className="size-5" aria-hidden />
            </div>
            <p className="text-sm text-foreground">{t("forgotSent")}</p>
            <p className="text-xs text-muted-foreground">
              {t("forgotSentHint")}
            </p>
            <Button
              variant="outline"
              className="mt-2 w-full"
              render={
                <Link href="/login">
                  <ArrowLeft className="size-4 rtl:-scale-x-100" />
                  {t("backToLogin")}
                </Link>
              }
            />
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder={t("emailPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {formError && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                className="mt-1 w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? t("forgotSending")
                  : t("forgotSubmit")}
              </Button>

              <Link
                href="/login"
                className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("backToLogin")}
              </Link>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}
