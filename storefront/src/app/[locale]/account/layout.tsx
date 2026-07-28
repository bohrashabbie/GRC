import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { redirect } from "next/navigation";

import { currentCustomer } from "@/app/actions";
import { AccountNav } from "@/components/account/account-nav";
import type { Locale } from "@/i18n/routing";

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

  // Every page under here is personal. Guarding once in the layout means no
  // individual page can forget to.
  const customer = await currentCustomer(locale as Locale);
  if (!customer) redirect(`/${locale}/account/login`);

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");

  return (
    <div className="container-site py-10 lg:py-14">
      <header className="mb-8">
        <h1 className="font-display text-h1 text-ink-900">
          {fullName ? t("greeting", { name: fullName }) : t("title")}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500" dir="ltr">
          {customer.email}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[14rem_1fr] lg:gap-12">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
