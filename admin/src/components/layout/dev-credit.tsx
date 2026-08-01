"use client"

import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

const CREDIT_URL = "https://www.burhanicreation.com"
const CREDIT_NAME = "burhanicreation.com"

/** Agency credit shown on the login screen and at the bottom of the shell. */
export function DevCredit({ className }: { className?: string }) {
  const t = useTranslations("app")

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t("designedBy")}{" "}
      <a
        href={CREDIT_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="underline-offset-4 hover:text-foreground hover:underline"
      >
        {CREDIT_NAME}
      </a>
    </p>
  )
}
