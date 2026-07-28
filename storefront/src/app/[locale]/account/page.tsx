import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { accountSummary } from "@/app/actions";
import { requireCustomer } from "@/lib/require-customer";
import { Link } from "@/i18n/navigation";
import { ChevronForwardIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";

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

  const typedLocale = locale as Locale;
  const customer = await requireCustomer(typedLocale);
  const [t, summary] = await Promise.all([
    getTranslations("account"),
    accountSummary(typedLocale),
  ]);

  // A count beside each card says how much is actually behind it. Null means
  // the summary could not be read, and no number beats a wrong one.
  const counts: Record<string, number | null> = {
    orders: summary?.order_count ?? null,
    addresses: summary?.address_count ?? null,
    wishlist: summary?.wishlist_count ?? null,
    profile: null,
  };

  return (
    <>
      <dl className="mb-8 grid gap-4 sm:grid-cols-3">
        {(["orders", "wishlist", "addresses"] as const).map((key) => (
          <div key={key} className="border border-hairline bg-surface p-5">
            <dt className="text-2xs uppercase tracking-widest text-ink-400 rtl:tracking-normal">
              {t(key)}
            </dt>
            <dd className="tabular mt-1.5 font-display text-h2 text-ink-900">
              {counts[key] ?? "—"}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="grid gap-4 sm:grid-cols-2">
      {SECTIONS.map((section) => (
        <li key={section.key}>
          <Link
            href={section.href}
            className="group flex items-center justify-between gap-4 border border-hairline bg-surface p-5 transition-colors hover:border-ink-400"
          >
            <span>
              <span className="block text-sm font-medium text-ink-900">
                {t(section.key)}
                {counts[section.key] !== null && (
                  <span className="tabular ms-2 text-2xs text-ink-400">
                    {counts[section.key]}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-2xs text-ink-500">
                {section.key === "profile" && customer
                  ? customer.email
                  : t(`${section.key}Description`)}
              </span>
            </span>
            <ChevronForwardIcon className="size-4 shrink-0 flip-rtl text-gold-500 transition-[translate] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </li>
      ))}
      </ul>
    </>
  );
}
