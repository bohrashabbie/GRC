import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/components/account/auth-form";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("registerTitle"), robots: { index: false, follow: true } };
}

export default async function RegisterPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { redirect } = await searchParams;
  setRequestLocale(locale);

  return <AuthForm mode="register" redirectTo={redirect} />;
}
