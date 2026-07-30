"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { registerAccount, signIn } from "@/app/actions";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import type { LocaleCode } from "@/types/shop";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign-in and registration.
 *
 * Both submit through a Server Action so the session token lands in an httpOnly
 * cookie and never touches browser JavaScript. On success the router is
 * refreshed as well as pushed: the layout resolves the customer and their
 * wishlist server-side, so without a refresh the header and every heart would
 * still render signed-out until the next full load.
 */
export function AuthForm({
  mode,
  redirectTo,
}: {
  mode: "login" | "register";
  /** Where to send the shopper after success, e.g. "/checkout" for anyone
   *  routed here by the checkout login prompt. Defaults to "/account". Must
   *  be a same-site path — anything else falls back to the default rather
   *  than sending someone off-site. */
  redirectTo?: string;
}) {
  const t = useTranslations("account");
  const tCheckout = useTranslations("checkout");

  const [values, setValues] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const locale = useLocale() as LocaleCode;
  const router = useRouter();

  const isRegister = mode === "register";

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const next: Record<string, string | undefined> = {};
    if (!EMAIL_PATTERN.test(values.email.trim())) next.email = tCheckout("invalidEmail");
    if (!values.password) next.password = tCheckout("required");

    if (isRegister) {
      if (!values.first_name.trim()) next.first_name = tCheckout("required");
      if (!values.last_name.trim()) next.last_name = tCheckout("required");
      if (values.password.length < 8) next.password = t("passwordTooShort");
      if (values.password !== values.confirm) next.confirm = t("passwordMismatch");
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    startTransition(async () => {
      const result = isRegister
        ? await registerAccount(
            {
              first_name: values.first_name.trim(),
              last_name: values.last_name.trim(),
              email: values.email.trim(),
              password: values.password,
              phone: values.phone.trim() || null,
              locale,
            },
            locale,
          )
        : await signIn(values.email.trim(), values.password, locale);

      if (result.ok) {
        const isSafe = redirectTo?.startsWith("/") && !redirectTo.startsWith("//");
        router.push(isSafe ? redirectTo! : "/account");
        // The layout reads the session on the server, so a push alone would
        // leave the header and the hearts rendering as signed out.
        router.refresh();
        return;
      }

      // Field-level where the server points at a field, banner otherwise.
      if (result.code === "email_already_registered") {
        setErrors({ email: t("emailTaken") });
      } else if (result.code === "password_too_short") {
        setErrors({ password: t("passwordTooShort") });
      } else if (result.code === "authentication_failed") {
        setFormError(t("badCredentials"));
      } else {
        setFormError(result.message);
      }
    });
  }

  return (
    <div className="container-site flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="font-display text-h1 text-ink-900">
          {isRegister ? t("registerTitle") : t("signInTitle")}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {isRegister ? t("registerSubtitle") : t("signInSubtitle")}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {formError && (
            <div role="alert" className="border-s-2 border-brick-600 bg-sand-100 px-4 py-3">
              <p className="text-sm text-brick-600">{formError}</p>
            </div>
          )}

          {isRegister && (
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label={t("firstName")}
                value={values.first_name}
                onChange={(event) => set("first_name", event.currentTarget.value)}
                error={errors.first_name}
                autoComplete="given-name"
              />
              <TextField
                label={t("lastName")}
                value={values.last_name}
                onChange={(event) => set("last_name", event.currentTarget.value)}
                error={errors.last_name}
                autoComplete="family-name"
              />
            </div>
          )}

          <TextField
            label={t("email")}
            type="email"
            value={values.email}
            onChange={(event) => set("email", event.currentTarget.value)}
            error={errors.email}
            autoComplete="email"
            dir="ltr"
          />

          {isRegister && (
            <TextField
              label={t("phone")}
              value={values.phone}
              onChange={(event) => set("phone", event.currentTarget.value)}
              autoComplete="tel"
              inputMode="tel"
              dir="ltr"
            />
          )}

          <TextField
            label={t("password")}
            type="password"
            value={values.password}
            onChange={(event) => set("password", event.currentTarget.value)}
            error={errors.password}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />

          {isRegister && (
            <TextField
              label={t("confirmPassword")}
              type="password"
              value={values.confirm}
              onChange={(event) => set("confirm", event.currentTarget.value)}
              error={errors.confirm}
              autoComplete="new-password"
            />
          )}

          {!isRegister && (
            <Link
              href="/account/login"
              className="inline-block text-xs text-gold-700 underline underline-offset-4"
            >
              {t("forgotPassword")}
            </Link>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? t("submitting") : isRegister ? t("register") : t("signIn")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          {isRegister ? t("hasAccount") : t("noAccount")}{" "}
          <Link
            href={{
              pathname: isRegister ? "/account/login" : "/account/register",
              // Carries the checkout return path across if the shopper
              // switches forms rather than filling in the one they landed on.
              query: redirectTo ? { redirect: redirectTo } : undefined,
            }}
            className="text-gold-700 underline underline-offset-4"
          >
            {isRegister ? t("signIn") : t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
