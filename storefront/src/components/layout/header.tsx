import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/logo";
import { CartButton } from "@/components/cart/cart-button";
import { HeartIcon, UserIcon } from "@/components/ui/icons";
import { getCategoryTree } from "@/lib/shop-api";
import type { Locale } from "@/i18n/routing";
import { TopBar } from "./top-bar";
import { MegaMenu } from "./mega-menu";
import { MobileMenuTrigger } from "./mobile-menu";
import { SearchBar, SearchDrawer } from "./search-bar";

export async function Header({ locale }: { locale: Locale }) {
  const [t, categories] = await Promise.all([
    getTranslations("header"),
    getCategoryTree(locale),
  ]);

  return (
    <header className="sticky top-0 z-40 bg-sand-50">
      {/* The promo bar scrolls away; the bar with the logo and cart stays. */}
      <TopBar />

      <div className="border-b border-hairline bg-sand-50">
        <div className="container-site flex h-16 items-center gap-3 md:h-20 md:gap-6">
          <MobileMenuTrigger />

          <Link href="/" className="shrink-0" aria-label={t("allCategories")}>
            <Logo />
          </Link>

          <SearchBar className="hidden flex-1 md:block" />

          <div className="ms-auto flex items-center gap-0.5 md:ms-0">
            <SearchDrawer />

            <Link
              href="/account"
              aria-label={t("account")}
              className="hidden size-10 items-center justify-center text-ink-800 transition-colors hover:text-palm-600 sm:inline-flex"
            >
              <UserIcon className="size-5" />
            </Link>

            <Link
              href="/account/wishlist"
              aria-label={t("wishlist")}
              className="hidden size-10 items-center justify-center text-ink-800 transition-colors hover:text-palm-600 sm:inline-flex"
            >
              <HeartIcon className="size-5" />
            </Link>

            <CartButton />
          </div>
        </div>
      </div>

      <div className="hidden border-b border-hairline bg-sand-50 lg:block">
        <MegaMenu categories={categories} />
      </div>
    </header>
  );
}
