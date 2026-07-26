"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Renders inside the locale layout, so the header,
 * footer and direction are all still correct when it appears.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    // Replace with the real reporter when one exists; swallowing it silently
    // would make production failures invisible.
    console.error(error);
  }, [error]);

  return (
    <div className="container-site flex min-h-[60vh] items-center justify-center py-20 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-h1 text-ink-900">{t("errorTitle")}</h1>
        <p className="mt-3 text-sm text-ink-500">{t("errorBody")}</p>
        <Button size="lg" className="mt-8" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
