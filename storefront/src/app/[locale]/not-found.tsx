import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="container-site flex min-h-[60vh] items-center justify-center py-20 text-center">
      <div className="max-w-md">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 font-display text-h1 text-ink-900">{t("notFoundTitle")}</h1>
        <p className="mt-3 text-sm text-ink-500">{t("notFoundBody")}</p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50 transition-colors hover:bg-palm-700"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
