"use client"

import { useTranslations } from "next-intl"

import { Breadcrumbs } from "@/components/breadcrumbs"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { NAV_SECTIONS } from "@/config/nav"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/providers/auth-provider"

export default function DashboardPage() {
  const t = useTranslations("nav")
  const auth = useTranslations("auth")
  const { user, permissions } = useAuth()

  // Everything the signed-in user can actually reach, minus the dashboard
  // itself — driven by the same permission-filtered nav config as the sidebar.
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.href !== "/dashboard" &&
        (!item.permission || permissions.has(item.permission))
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("dashboard") }]} />
      <PageHeader
        title={t("dashboard")}
        description={
          user ? `${auth("signedInAs")} ${user.full_name} (${user.email})` : undefined
        }
      />

      {sections.map((section) => (
        <div key={section.labelKey} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t(section.labelKey)}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate">
                          {t(item.labelKey)}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {item.permission ?? "—"}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
