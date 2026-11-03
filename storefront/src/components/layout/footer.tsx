import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/ui/logo";
import { NewsletterForm } from "./newsletter-form";
import {
  ApplePayLogo,
  KnetLogo,
  MailIcon,
  MastercardLogo,
  PhoneIcon,
  VisaLogo,
  WhatsappIcon,
} from "@/components/ui/icons";
import { CREDIT_NAME, contactFromSettings } from "@/lib/site-contact";
import { getMenu, getPublicSettings } from "@/lib/shop-api";
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
  { name: "KNET", Logo: KnetLogo, logoClass: "size-6" },
  { name: "Visa", Logo: VisaLogo, logoClass: "size-9" },
  { name: "Mastercard", Logo: MastercardLogo, logoClass: "size-8" },
  { name: "Apple Pay", Logo: ApplePayLogo, logoClass: "size-9" },
];

/**
 * Three bands, each aligned to the same container edges: a newsletter strip,
 * three equal columns (brand, links, contact) and a legal bar. The old layout
 * stacked newsletter, socials and contact into one narrow column beside a
 * floating link list, so nothing lined up across the two halves.
 */
export async function Footer({ locale }: { locale: Locale }) {
  const [t, tApp, menu, settings] = await Promise.all([
    getTranslations("footer"),
    getTranslations("app"),
    getMenu(MENU_CODE, locale),
    getPublicSettings(locale),
  ]);

  // Staff-editable in Settings. Each renders only once it has a value — an
  // empty "CR:" label is worse than no line at all, and these were removed
  // from the footer once already for being placeholders.
  const crNumber = String(settings["store.cr_number"] ?? "").trim();
  const vatNumber = String(settings["store.vat_number"] ?? "").trim();

  // Email, phone, address, hours and the social links are all Settings keys
  // now (group "contact"), so staff change them without a deploy.
  const contact = contactFromSettings(settings, locale);

  const linkClass = "text-sm text-sand-300 transition-colors hover:text-gold-300";

  return (
    <footer className="bg-ink-900 text-sand-200">
      {/* Newsletter strip */}
      <div className="border-b border-ink-700/70">
        <div className="container-site flex flex-col gap-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="max-w-md">
            <h2 className="font-display text-2xl text-sand-50">{t("newsletterTitle")}</h2>
            <p className="mt-1.5 text-sm text-sand-300">{t("newsletterBody")}</p>
          </div>
          <div className="w-full lg:max-w-md [&_form]:mt-0 [&_p]:mt-0">
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Three even columns */}
      <div className="container-site grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-16">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 text-sand-50">
            <LogoMark className="size-10" invert />
            <span className="font-display text-2xl">{tApp("name")}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-sand-300">{t("brandBlurb")}</p>

          {contact.socials.length > 0 && (
            <>
              <h2 className="eyebrow mt-8 text-gold-400">{t("followUs")}</h2>
              <ul className="mt-4 flex flex-wrap items-center gap-2">
                {contact.socials.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={label}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-ink-700 text-sand-300 transition-colors hover:border-gold-500 hover:text-gold-300"
                    >
                      <Icon className="size-4.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <nav aria-label={t("linksTitle")}>
          <h2 className="eyebrow text-gold-400">{t("linksTitle")}</h2>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
            {menu.items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow text-gold-400">{t("contactTitle")}</h2>
          {/* Each line renders only once it has a value: a blank setting
              removes the line rather than leaving a dead link. */}
          <ul className="mt-5 space-y-3.5">
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className={`inline-flex items-center gap-3 ${linkClass}`}>
                  <MailIcon className="size-4.5 shrink-0 text-gold-400" />
                  <span dir="ltr">{contact.email}</span>
                </a>
              </li>
            )}
            {contact.whatsappHref && (
              <li>
                <a
                  href={contact.whatsappHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`inline-flex items-center gap-3 ${linkClass}`}
                >
                  <WhatsappIcon className="size-4.5 shrink-0 text-gold-400" />
                  <span>{t("chatOnWhatsapp")}</span>
                </a>
              </li>
            )}
            {contact.phoneHref && (
              <li>
                <a href={contact.phoneHref} className={`inline-flex items-center gap-3 ${linkClass}`}>
                  <PhoneIcon className="size-4.5 shrink-0 text-gold-400" />
                  <span dir="ltr" className="tabular">
                    {contact.phoneDisplay}
                  </span>
                </a>
              </li>
            )}
            {contact.address && <li className="text-sm leading-relaxed text-sand-300">{contact.address}</li>}
            {contact.hours && <li className="text-sm text-sand-300">{contact.hours}</li>}
          </ul>
        </div>
      </div>

      {/* Legal bar */}
      <div className="border-t border-ink-700/70">
        <div className="container-site flex flex-col items-center gap-4 py-6 text-center lg:flex-row lg:justify-between lg:text-start">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-2xs text-ink-400 lg:justify-start">
            <span>{t("rights", { year: new Date().getFullYear() })}</span>
            {crNumber && (
              <span dir="ltr" className="tabular">
                {t("crNumber")}: {crNumber}
              </span>
            )}
            {vatNumber && (
              <span dir="ltr" className="tabular">
                {t("vatNumber")}: {vatNumber}
              </span>
            )}
            <span>
              {t("designedBy")} <span className="text-sand-300">{CREDIT_NAME}</span>
            </span>
          </div>

          {/* lg:me-20 keeps the last card clear of the floating WhatsApp
              button, which is fixed to the same logical end corner. */}
          <ul aria-label={t("paymentMethods")} className="flex flex-wrap items-center justify-center gap-2 lg:me-20">
            {PAYMENT_METHODS.map(({ name, Logo, logoClass }) => (
              <li
                key={name}
                title={name}
                className="flex h-8 w-12 items-center justify-center rounded-sm bg-white"
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
