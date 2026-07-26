import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ChevronForwardIcon } from "@/components/ui/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

const SECTIONS = [
  { key: "orders", href: "/account/orders" },
  { key: "addresses", href: "/account/addresses" },
  { key: "wishlist", href: "/account/wishlist" },
  { key: "profile", href: "/account/profile" },
] as const;

export default async function AccountPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("account");

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {SECTIONS.map((section) => (
        <li key={section.key}>
          <Link
            href={section.href}
            className="group flex items-center justify-between gap-4 border border-hairline bg-surface p-5 transition-colors hover:border-ink-400"
          >
            <span>
              <span className="block text-sm font-medium text-ink-900">{t(section.key)}</span>
              <span className="mt-1 block text-2xs text-ink-500">
                {t(`${section.key}Description`)}
              </span>
            </span>
            <ChevronForwardIcon className="size-4 shrink-0 flip-rtl text-gold-500 transition-[translate] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
