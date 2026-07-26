"use client"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { BrandLogo } from "./brand-logo"
import { SidebarNav } from "./sidebar-nav"
import { localeDirections, type Locale } from "@/i18n/routing"

/** Fixed collapsible column, desktop only (md+). */
export function AppSidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const t = useTranslations("nav")

  return (
    <aside
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150 md:flex"
      style={{ width: collapsed ? "4rem" : "16rem" }}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-3">
        <BrandLogo collapsed={collapsed} />
        <Button
          variant="ghost"
          size="icon-sm"
          className="ms-auto"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t("expand") : t("collapse")}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>
      <SidebarNav collapsed={collapsed} />
    </aside>
  )
}

/** Sheet-based sidebar for < md, opened from the topbar's menu button. Opens
 * from the side the sidebar would naturally sit on for the active locale. */
export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const app = useTranslations("app")
  const locale = useLocale() as Locale
  const dir = localeDirections[locale]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-72 p-0">
        <SheetHeader className="h-14 justify-center border-b px-4 py-0">
          <SheetTitle className="text-sm">{app("shortName")}</SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}
