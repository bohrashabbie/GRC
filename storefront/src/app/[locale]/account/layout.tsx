import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { currentCustomer } from "@/app/actions";
import { AccountNav } from "@/components/account/account-nav";
import type { Locale } from "@/i18n/routing";

/**
 * Chrome shared by every signed-in account page.
 *
 * `/account/login` and `/account/register` nest inside this layout — their own
 * layout strips the sidebar but a child layout cannot escape its parent — so
 * this must never redirect. Doing so pointed the sign-in page at itself and
 * looped until Next.js gave up, rendering a blank page. Pages that require a
 * session call `requireCustomer` individually; signed out, this renders the
 * children bare so the auth forms come through untouched.
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

  const customer = await currentCustomer(locale as Locale);
  // Signed out: no heading, no sidebar, just whatever the route renders — which
  // for the auth routes is the form itself.
  if (!customer) return <>{children}</>;

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
