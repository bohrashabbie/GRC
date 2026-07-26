"use client"

import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

/**
 * GRC brand mark: the monogram tile from public/logo-mark.svg plus the
 * wordmark. The wordmark is live text rather than part of the SVG so it picks
 * up the app font and stays sharp at any zoom.
 *
 * To swap in a different logo, replace public/logo-mark.svg — nothing here
 * needs to change.
 */
export function BrandLogo({
  collapsed = false,
  size = "default",
  className,
}: {
  collapsed?: boolean
  size?: "default" | "lg"
  className?: string
}) {
  const app = useTranslations("app")

  const boxSize = size === "lg" ? "size-10" : "size-7"
  const textSize = size === "lg" ? "text-xl" : "text-base"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG
          in /public needs no optimisation pipeline. */}
      <img
        src="/logo-mark.svg"
        alt=""
        aria-hidden
        className={cn("shrink-0", boxSize)}
      />
      {!collapsed && (
        <span className={cn("truncate font-semibold tracking-tight", textSize)}>
          {app("shortName")}
        </span>
      )}
      {collapsed && <span className="sr-only">{app("name")}</span>}
    </div>
  )
}
