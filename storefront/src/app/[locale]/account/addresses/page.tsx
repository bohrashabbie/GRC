import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getAddresses } from "@/lib/shop-api";
import { addressLines } from "@/lib/format";
import type { Locale } from "@/i18n/routing";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("addresses"), robots: { index: false, follow: false } };
}

export default async function AddressesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const [t, tCheckout, addresses] = await Promise.all([
    getTranslations("account"),
    getTranslations("checkout"),
    getAddresses(typedLocale),
  ]);

  if (addresses.length === 0) {
    return <p className="py-16 text-center text-sm text-ink-500">{t("addressesEmpty")}</p>;
  }

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="relative border border-hairline bg-surface p-5 text-sm text-ink-600"
          >
            {address.is_default && (
              <span className="absolute top-4 end-4 bg-palm-600/12 px-2 py-0.5 text-2xs text-palm-700">
                {t("defaultAddress")}
              </span>
            )}

            <p className="font-medium text-ink-900">{address.full_name}</p>

            <address className="mt-2 not-italic leading-relaxed">
              {addressLines(address).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="tabular block" dir="ltr">
                {address.phone}
              </span>
            </address>

            {/* Editing needs `POST/PATCH /shop/v1/account/addresses`, which
                does not exist. Rendering live buttons that silently do nothing
                would be worse than leaving the card read-only. */}
          </li>
        ))}
      </ul>

      <p className="text-2xs text-ink-400">
        {tCheckout("savedAddresses")} — {addresses.length}
      </p>
    </div>
  );
}
