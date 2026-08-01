"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

import { AppSidebar, MobileSidebar } from "./app-sidebar"
import { DevCredit } from "./dev-credit"
import { Topbar } from "./topbar"
import { useAuth } from "@/providers/auth-provider"
import { useRouter } from "@/i18n/navigation"

const COLLAPSE_STORAGE_KEY = "grc_sidebar_collapsed"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()
  const t = useTranslations("auth")

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1")
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0")
      return next
    })
  }

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("checkingSession")}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh">
      <AppSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </main>
        <footer className="border-t border-border px-4 py-3 md:px-6">
          <DevCredit className="text-center" />
        </footer>
      </div>
    </div>
  )
}
