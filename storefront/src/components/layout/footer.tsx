import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/ui/logo";
import {
  ApplePayLogo,
  KnetLogo,
  MastercardLogo,
  VisaLogo,
  WhatsappIcon,
} from "@/components/ui/icons";
import {
  CONTACT_EMAIL,
  CREDIT_NAME,
  CREDIT_URL,
  SOCIALS,
  WHATSAPP_DISPLAY,
  WHATSAPP_HREF,
} from "@/lib/site-contact";
import { getMenu } from "@/lib/shop-api";
import type { Locale } from "@/i18n/routing";

// Only one "footer" menu is seeded in the CMS today — a single combined
// column, not the three-column (company/info/support) split this footer
// used to request before those extra menus existed.
const MENU_CODE = "footer";

// Real scheme marks on white cards, the way payment badges read everywhere
// else. Each logo gets its own size class because the marks have very
// different proportions — the Visa wordmark is short and wide, the Mastercard
// circles are tall — and one shared size makes them look mismatched.
const PAYMENT_METHODS = [
  { name: "Visa", Logo: VisaLogo, logoClass: "size-9" },
  { name: "Mastercard", Logo: MastercardLogo, logoClass: "size-8" },
  { name: "KNET", Logo: KnetLogo, logoClass: "size-6" },
  { name: "Apple Pay", Logo: ApplePayLogo, logoClass: "size-9" },
];

export async function Footer({ locale }: { locale: Locale }) {
  const [t, menu] = await Promise.all([
    getTranslations("footer"),
    getMenu(MENU_CODE, locale),
  ]);

  return (
    <footer className="bg-ink-900 text-sand-200">
      <div className="container-site grid gap-12 py-16 lg:grid-cols-[1fr_1fr] lg:gap-8">
        {/* Brand + newsletter */}
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5 text-sand-50">
            <LogoMark className="size-7" invert />
            <span className="font-display text-2xl">{t("newsletterTitle")}</span>
          </div>

          <p className="mt-3 text-sm text-sand-300">{t("newsletterBody")}</p>

          {/* No newsletter_subscribers table exists yet, so this posts nowhere.
              Wired up when the backend lands. */}
          <form className="mt-5 flex gap-2">
            <input
              type="email"
              required
              placeholder={t("emailPlaceholder")}
              aria-label={t("emailPlaceholder")}
              className="h-11 min-w-0 flex-1 rounded-xs border border-ink-600 bg-ink-800 px-3.5 text-sm text-sand-50 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
            />
            <button
              type="submit"
              className="h-11 shrink-0 rounded-xs bg-gold-400 px-5 text-sm font-medium text-ink-900 transition-colors hover:bg-gold-300"
            >
              {t("subscribe")}
            </button>
          </form>

          <div className="mt-8">
            <p className="eyebrow text-gold-400">{t("followUs")}</p>
            <ul className="mt-3 flex items-center gap-2">
              {SOCIALS.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    className="inline-flex size-10 items-center justify-center border border-ink-700 text-sand-300 transition-colors hover:border-gold-500 hover:text-gold-300"
                  >
                    <Icon className="size-4.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <p className="eyebrow text-gold-400">{t("contactTitle")}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  dir="ltr"
                  className="text-sand-300 transition-colors hover:text-gold-300"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 text-sand-300 transition-colors hover:text-gold-300"
                >
                  <WhatsappIcon className="size-4.5" />
                  <span dir="ltr" className="tabular">{WHATSAPP_DISPLAY}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Link column — a 2-column grid rather than one long list, since a
            single seeded menu (6 items) reads as sparse next to the brand
            block otherwise. */}
        <nav aria-label={t("linksTitle")}>
          <h2 className="eyebrow text-gold-400">{t("linksTitle")}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2.5">
            {menu.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="text-sm text-sand-300 transition-colors hover:text-sand-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Legal bar */}
      <div className="border-t border-ink-700">
        <div className="container-site flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-2xs text-ink-400">
            <span>{t("rights", { year: new Date().getFullYear() })}</span>
            <span>
              {t("designedBy")}{" "}
              <a
                href={CREDIT_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sand-300 transition-colors hover:text-gold-300"
              >
                {CREDIT_NAME}
              </a>
            </span>
          </div>

          {/* lg:me-20 keeps the last card clear of the floating WhatsApp
              button, which is fixed to the same logical end corner. */}
          <ul
            aria-label={t("paymentMethods")}
            className="flex flex-wrap items-center gap-2 lg:me-20"
          >
            {PAYMENT_METHODS.map(({ name, Logo, logoClass }) => (
              <li
                key={name}
                title={name}
                className="flex h-9 w-14 items-center justify-center rounded-sm bg-white"
              >
                <Logo className={logoClass} />
                <span className="sr-only">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
