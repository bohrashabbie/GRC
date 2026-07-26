"use client"

import { Menu } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { LocaleSwitcher } from "./locale-switcher"
import { UserMenu } from "./user-menu"

export function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const t = useTranslations("nav")

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/75">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobileMenu}
        aria-label={t("openMenu")}
      >
        <Menu className="size-4" />
      </Button>
      <div className="flex-1" />
      <LocaleSwitcher />
      <UserMenu />
    </header>
  )
}
