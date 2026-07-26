import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ShieldIcon } from "@/components/ui/icons";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string; email?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "confirmation" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function ConfirmationPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, query] = await Promise.all([getTranslations("confirmation"), searchParams]);

  const orderNumber = query.order ?? "—";
  const email = query.email ?? "";

  return (
    <div className="container-site flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-lg text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-palm-600/10">
          <ShieldIcon className="size-8 text-palm-600" />
        </span>

        <h1 className="mt-6 font-display text-h1 text-ink-900">{t("title")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-500">
          {t("body", { email, orderNumber })}
        </p>

        <div className="mt-8 border-y border-hairline py-5">
          <p className="eyebrow">{t("orderNumber")}</p>
          <p className="tabular mt-1.5 text-lg font-semibold text-ink-900" dir="ltr">
            {orderNumber}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/account/orders"
            className="inline-flex h-12 items-center rounded-xs bg-palm-600 px-6 text-sm font-medium text-sand-50 transition-colors hover:bg-palm-700"
          >
            {t("trackOrder")}
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-xs border border-ink-900 px-6 text-sm text-ink-900 transition-colors hover:bg-ink-900 hover:text-sand-50"
          >
            {t("continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
