"use client"

import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import { NAV_SECTIONS } from "@/config/nav"
import { useAuth } from "@/providers/auth-provider"
import { cn } from "@/lib/utils"

function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  onNavigate,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}

/** Shared between the fixed desktop sidebar and the mobile sheet. Nav items
 * are filtered by permission key, never by role name — see PERMISSIONS. */
export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const t = useTranslations("nav")
  const { permissions } = useAuth()

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-4">
      {NAV_SECTIONS.map((section) => {
        const visibleItems = section.items.filter(
          (item) => !item.permission || permissions.has(item.permission)
        )
        if (visibleItems.length === 0) return null

        return (
          <div key={section.labelKey} className="flex flex-col gap-1">
            {!collapsed && (
              <span className="px-2.5 text-xs font-medium text-muted-foreground/70">
                {t(section.labelKey)}
              </span>
            )}
            {visibleItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={t(item.labelKey)}
                icon={item.icon}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )
      })}
    </nav>
  )
}
