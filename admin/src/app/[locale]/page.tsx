import { redirect } from "@/i18n/navigation"
import { isLocale, defaultLocale } from "@/i18n/routing"

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale

  // The (protected) layout's AuthProvider/AppShell decides whether this
  // actually resolves or bounces to /login — this is just the entry point.
  redirect({ href: "/dashboard", locale })
}
