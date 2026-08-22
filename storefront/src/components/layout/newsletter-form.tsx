"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { subscribeToNewsletter } from "@/app/actions";
import type { Locale } from "@/i18n/routing";

/**
 * The footer's "Join the list" box.
 *
 * It posted nowhere until now — the address was typed, the button was pressed,
 * and nothing was kept. It writes to the subscriber list the admin shows, and
 * says so: a form that swallows what you gave it teaches people not to bother.
 */
export function NewsletterForm() {
  const t = useTranslations("footer");
  const locale = useLocale() as Locale;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;

    startTransition(async () => {
      const ok = await subscribeToNewsletter(address, locale);
      setState(ok ? "done" : "error");
      if (ok) setEmail("");
    });
  }

  if (state === "done") {
    return (
      <p className="mt-5 text-sm text-gold-300" role="status">
        {t("newsletterThanks")}
      </p>
    );
  }

  return (
    <form className="mt-5 flex gap-2" onSubmit={onSubmit} noValidate>
      <input
        type="email"
        required
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (state === "error") setState("idle");
        }}
        placeholder={t("emailPlaceholder")}
        aria-label={t("emailPlaceholder")}
        aria-invalid={state === "error"}
        className="h-11 min-w-0 flex-1 rounded-xs border border-ink-600 bg-ink-800 px-3.5 text-sm text-sand-50 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="h-11 shrink-0 rounded-xs bg-gold-400 px-5 text-sm font-medium text-ink-900 transition-colors hover:bg-gold-300 disabled:opacity-60"
      >
        {isPending ? t("newsletterSending") : t("subscribe")}
      </button>
      {state === "error" && (
        <p className="sr-only" role="alert">
          {t("newsletterError")}
        </p>
      )}
    </form>
  );
}
