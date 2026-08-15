"use client"

import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

const CREDIT_NAME = "Razain"

/** Credit shown on the login screen and at the bottom of the shell. */
export function DevCredit({ className }: { className?: string }) {
  const t = useTranslations("app")

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t("designedBy")} {CREDIT_NAME}
    </p>
  )
}
