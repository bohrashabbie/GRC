import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountNav } from "@/components/account/account-nav";

/**
 * Chrome shared by every signed-in account page. The auth pages sit at
 * `/account/login` and `/account/register` and deliberately live outside this
 * layout — showing an account sidebar to someone who isn't signed in yet is
 * just noise.
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("account");

  return (
    <div className="container-site py-10 lg:py-14">
      <h1 className="mb-8 font-display text-h1 text-ink-900">{t("title")}</h1>

      <div className="grid gap-8 lg:grid-cols-[14rem_1fr] lg:gap-12">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
