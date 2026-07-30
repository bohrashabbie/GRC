import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/components/account/auth-form";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("signInTitle"), robots: { index: false, follow: true } };
}

export default async function LoginPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AuthForm mode="login" />;
}
