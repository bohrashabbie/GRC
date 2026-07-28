import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileMenuProvider } from "@/components/layout/mobile-menu";
import { CartProvider } from "@/components/cart/cart-provider";
import { SessionProvider } from "@/components/account/session-provider";
import { WishlistProvider } from "@/components/product/wishlist-provider";
import { currentCustomer, loadWishlist } from "@/app/actions";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { fontVariables } from "@/lib/fonts";
import { getCategoryTree } from "@/lib/shop-api";
import { localeDirection, locales, routing, type Locale } from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });

  return {
    title: { default: t("name"), template: `%s — ${t("name")}` },
    description: t("tagline"),
    alternates: {
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Lets the whole subtree render statically instead of opting into dynamic
  // rendering the moment a translation is read.
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  // Fetched here so the first paint already knows who is signed in and which
  // hearts are filled, instead of every card flashing empty and correcting.
  const [categories, customer, wishlist] = await Promise.all([
    getCategoryTree(typedLocale),
    currentCustomer(typedLocale),
    loadWishlist(typedLocale),
  ]);

  return (
    <html lang={locale} dir={localeDirection[typedLocale]} className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <SessionProvider customer={customer}>
            <WishlistProvider initialProductIds={wishlist}>
              <CartProvider>
            <MobileMenuProvider categories={categories}>
              <Header locale={typedLocale} />
              {/* The bottom nav is fixed and ~64px tall, so the last section of
                  every page needs matching clearance on mobile. */}
              <main className="flex-1 pb-16 md:pb-0">{children}</main>
              <Footer locale={typedLocale} />
              <MobileBottomNav />
              <CartDrawer />
            </MobileMenuProvider>
              </CartProvider>
            </WishlistProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
