"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign-in and registration.
 *
 * `customer_sessions` and `verification_tokens` do not exist yet, so these
 * forms validate and show their pending state but do not authenticate. The
 * layout, validation and error handling are final; only the submit handler
 * changes when `POST /shop/v1/auth/login` lands.
 */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
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
  const [isPending, setIsPending] = useState(false);

  const isRegister = mode === "register";

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const next: Record<string, string | undefined> = {};
    if (!EMAIL_PATTERN.test(values.email.trim())) next.email = tCheckout("invalidEmail");
    if (!values.password) next.password = tCheckout("required");

    if (isRegister) {
      if (!values.first_name.trim()) next.first_name = tCheckout("required");
      if (!values.last_name.trim()) next.last_name = tCheckout("required");
      if (values.password !== values.confirm) next.confirm = t("passwordMismatch");
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsPending(true);
    setTimeout(() => setIsPending(false), 900);
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
            {isRegister ? t("register") : t("signIn")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          {isRegister ? t("hasAccount") : t("noAccount")}{" "}
          <Link
            href={isRegister ? "/account/login" : "/account/register"}
            className="text-gold-700 underline underline-offset-4"
          >
            {isRegister ? t("signIn") : t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
