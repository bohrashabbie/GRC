import { ChevronLeft, ChevronRight } from "lucide-react"
import { Fragment } from "react"

import { Link } from "@/i18n/navigation"
import { useLocale } from "next-intl"
import { localeDirections, type Locale } from "@/i18n/routing"

export type BreadcrumbItem = {
  label: string
  href?: string
}

/** Rendered at the top of each page's content, not in the shared topbar, so a
 * detail page can include the loaded entity's name once it arrives. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const locale = useLocale() as Locale
  const dir = localeDirections[locale]
  const Separator = dir === "rtl" ? ChevronLeft : ChevronRight

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <Separator
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
              )}
              <li>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={isLast ? "font-medium text-foreground" : "text-muted-foreground"}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
