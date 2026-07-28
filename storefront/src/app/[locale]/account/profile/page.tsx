import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { notFound } from "next/navigation";

import { currentCustomer } from "@/app/actions";
import { ProfileForm } from "@/components/account/profile-form";
import type { Locale } from "@/i18n/routing";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("profile"), robots: { index: false, follow: false } };
}

export default async function ProfilePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The layout already redirects a signed-out visitor; this is belt and braces
  // so the component can take a non-null customer.
  const customer = await currentCustomer(locale as Locale);
  if (!customer) notFound();

  return <ProfileForm customer={customer} />;
}
