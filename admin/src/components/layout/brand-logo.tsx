"use client"

import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

/**
 * GR8 brand mark: public/logo-full.png is the full wordmark artwork (the
 * "Gr8" lettering is baked into the image), so no separate text is rendered
 * beside it. The collapsed sidebar rail is too narrow for the wordmark's
 * wide aspect ratio, so it renders nothing there but an accessible name.
 *
 * To swap in a different logo, replace public/logo-full.png — nothing here
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

  if (collapsed) {
    return <span className="sr-only">{app("name")}</span>
  }

  const height = size === "lg" ? "h-10" : "h-7"

  return (
    <div className={cn("flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static PNG
          in /public needs no optimisation pipeline. */}
      <img
        src="/logo-full.png"
        alt={app("shortName")}
        className={cn("w-auto object-contain", height)}
      />
    </div>
  )
}
