"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BrandLogo } from "@/components/layout/brand-logo"
import { DevCredit } from "@/components/layout/dev-credit"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { isApiError } from "@/lib/api/errors"
import { useAuth } from "@/providers/auth-provider"
import { Link, useRouter } from "@/i18n/navigation"

function useLoginSchema() {
  const v = useTranslations("validation")
  return z.object({
    email: z
      .string()
      .min(1, v("emailRequired"))
      .email(v("emailInvalid")),
    password: z.string().min(1, v("passwordRequired")),
  })
}

type LoginValues = { email: string; password: string }

export default function LoginPage() {
  const t = useTranslations("auth")
  const c = useTranslations("common")
  const { status, login } = useAuth()
  const router = useRouter()
  const schema = useLoginSchema()
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard")
  }, [status, router])

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      await login(values.email, values.password)
      router.replace("/dashboard")
    } catch (error) {
      if (isApiError(error)) {
        if (error.status === 501) {
          setFormError(t("mfaUnsupported"))
        } else if (error.isAuth) {
          setFormError(t("invalidCredentials"))
        } else {
          setFormError(error.message)
        }
        return
      }
      setFormError(c("unknownError"))
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <BrandLogo size="lg" />
          <h1 className="text-xl font-semibold text-foreground">
            {t("loginTitle")}
          </h1>
          <p className="text-muted-foreground">{t("loginSubtitle")}</p>
        </div>

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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>{t("password")}</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {t("forgotPassword")}
                    </Link>
                  </div>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        className="pe-9"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? t("hidePassword") : t("showPassword")
                      }
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 end-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
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
              {form.formState.isSubmitting ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </Form>
      </div>

      <DevCredit className="mt-4 text-center" />
    </div>
  )
}
