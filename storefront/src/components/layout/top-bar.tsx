import { useTranslations } from "next-intl";

import { SOCIALS } from "@/lib/site-contact";
import { LocaleSwitch } from "./locale-switch";

export function TopBar() {
  const t = useTranslations("topbar");

  return (
    <div className="bg-ink-900 text-sand-200">
      <div className="container-site flex h-10 items-center justify-between gap-4">
        {/* Socials are the lowest-priority item, so they are the thing that
            disappears first on small screens. */}
        <ul className="hidden items-center gap-1 md:flex">
          {SOCIALS.map(({ href, label, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                className="inline-flex size-8 items-center justify-center text-sand-300 transition-colors hover:text-gold-300"
              >
                <Icon className="size-4" />
              </a>
            </li>
          ))}
        </ul>

        <p className="flex-1 text-center text-xs text-sand-200 md:flex-none">{t("promo")}</p>

        <LocaleSwitch className="text-sand-200" />
      </div>
    </div>
  );
}
