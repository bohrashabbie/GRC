"use client"

import { useTranslations } from "next-intl"

import type { DeletionResult } from "@/lib/api/types"

/**
 * Turns a DeletionResult into the sentence shown after a delete.
 *
 * The backend removes a row only when nothing references it, so "deleted"
 * cannot be assumed — when it falls back to deactivating, the user needs to
 * know that happened and what is holding the row, or they will delete twice
 * and wonder why the row is still listed.
 *
 * Blocker keys arrive as stable machine strings ("purchase_orders"), never
 * prose, because the admin's default locale is Arabic and server-side English
 * would leak straight into the RTL UI.
 */
export function useDeletionMessage() {
  const t = useTranslations("deletion")

  return function message(result: DeletionResult, name: string): string {
    if (result.mode === "deleted") {
      return t("deleted", { name })
    }
    const reasons = Object.entries(result.blockers)
      .map(([key, count]) => t(`blockers.${key}`, { count }))
      .join(t("reasonSeparator"))
    return t("deactivatedInstead", { name, reasons })
  }
}
