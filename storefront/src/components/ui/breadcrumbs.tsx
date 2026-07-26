import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ChevronForwardIcon } from "@/components/ui/icons";

export interface Crumb {
  href?: string;
  label: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const t = useTranslations("header");

  const all: Crumb[] = [{ href: "/", label: t("home") }, ...crumbs];

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
        {all.map((crumb, index) => {
          const isLast = index === all.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="transition-colors hover:text-ink-700">
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? "text-ink-700" : undefined} aria-current={isLast ? "page" : undefined}>
                  {crumb.label}
                </span>
              )}
              {!isLast && <ChevronForwardIcon className="size-3 flip-rtl text-sand-400" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
