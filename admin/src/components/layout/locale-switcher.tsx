"use client"

import { Languages } from "lucide-react"
import { useLocale } from "next-intl"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname, useRouter } from "@/i18n/navigation"
import { locales, localeLabels, type Locale } from "@/i18n/routing"

export function LocaleSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function switchTo(next: Locale) {
    const search = searchParams.toString()
    router.replace(search ? `${pathname}?${search}` : pathname, {
      locale: next,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Change language">
            <Languages className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            data-active={code === locale}
            onClick={() => switchTo(code)}
            className="data-[active=true]:font-medium data-[active=true]:text-foreground"
          >
            {localeLabels[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
