"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { submitContactMessage } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { LocaleCode } from "@/types/shop";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The form under the Contact Us page's CMS body (template "contact").
 *
 * Submits through a Server Action like every other storefront write. On
 * success the form is replaced by a confirmation rather than cleared — a blank
 * form after pressing send reads as "did that go through?".
 */
export function ContactForm() {
  const t = useTranslations("contact");
  const tCheckout = useTranslations("checkout");
  const locale = useLocale() as LocaleCode;

  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const messageId = useId();

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const next: Record<string, string | undefined> = {};
    if (values.name.trim().length < 2) next.name = tCheckout("required");
    if (!EMAIL_PATTERN.test(values.email.trim())) next.email = tCheckout("invalidEmail");
    if (values.message.trim().length < 10) next.message = t("messageTooShort");

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    startTransition(async () => {
      const result = await submitContactMessage(
        {
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || null,
          subject: values.subject.trim() || null,
          message: values.message.trim(),
        },
        locale,
      );

      if (result.ok) {
        setSent(true);
        return;
      }
      setFormError(result.code === "unreachable" ? t("unreachable") : result.message);
    });
  }

  if (sent) {
    return (
      <div role="status" className="border-s-2 border-gold-500 bg-sand-100 px-5 py-4">
        <p className="font-medium text-ink-900">{t("sentTitle")}</p>
        <p className="mt-1 text-sm text-ink-500">{t("sentBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <div role="alert" className="border-s-2 border-brick-600 bg-sand-100 px-4 py-3">
          <p className="text-sm text-brick-600">{formError}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t("name")}
          value={values.name}
          onChange={(event) => set("name", event.currentTarget.value)}
          error={errors.name}
          autoComplete="name"
        />
        <TextField
          label={t("email")}
          type="email"
          value={values.email}
          onChange={(event) => set("email", event.currentTarget.value)}
          error={errors.email}
          autoComplete="email"
          dir="ltr"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t("phone")}
          optional={t("optional")}
          value={values.phone}
          onChange={(event) => set("phone", event.currentTarget.value)}
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
        />
        <TextField
          label={t("subject")}
          optional={t("optional")}
          value={values.subject}
          onChange={(event) => set("subject", event.currentTarget.value)}
        />
      </div>

      {/* field.tsx has no textarea variant yet; this mirrors its shell so the
          form reads as one control set. Extract if a second textarea appears. */}
      <div>
        <label
          htmlFor={messageId}
          className="mb-1.5 flex items-baseline gap-2 text-xs text-ink-600"
        >
          {t("message")}
        </label>
        <textarea
          id={messageId}
          rows={6}
          value={values.message}
          onChange={(event) => set("message", event.currentTarget.value)}
          aria-invalid={Boolean(errors.message)}
          className={cn(
            "w-full rounded-xs border bg-surface px-3.5 py-3 text-sm text-ink-900",
            "placeholder:text-ink-400 focus:outline-none",
            errors.message
              ? "border-brick-600"
              : "border-hairline-strong focus:border-gold-500",
          )}
        />
        {errors.message && <p className="mt-1.5 text-2xs text-brick-600">{errors.message}</p>}
      </div>

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
