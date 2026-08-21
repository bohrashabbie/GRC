import {
  FacebookIcon,
  InstagramIcon,
  SnapchatIcon,
  TiktokIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@/components/ui/icons";
import { getPublicSettings } from "@/lib/shop-api";
import type { Locale } from "@/i18n/routing";

/**
 * Every off-site contact detail in one place.
 *
 * The values live in Settings in the admin (group "contact", flagged public),
 * so staff change a number or a link themselves. The constants below are the
 * fallback for a key nobody has set yet — they are what the site showed before
 * any of this was editable, so an unset key never blanks the footer.
 */

export const DEFAULT_CONTACT_EMAIL = "afezzy@gmail.com";

// International format, digits only — Kuwait country code + the store mobile.
export const DEFAULT_WHATSAPP_NUMBER = "96597275271";

/** Shown next to the WhatsApp link; keep LTR even in the Arabic layout. */
export const DEFAULT_PHONE_DISPLAY = "+965 9727 5271";

export const DEFAULT_SOCIAL_URLS = {
  facebook: "https://www.facebook.com/profile.php?id=61592648282235",
  tiktok: "https://www.tiktok.com/@gr8_trend",
  youtube: "https://www.youtube.com/@Gr8Trend",
  instagram: "https://www.instagram.com/gr8_trend",
  snapchat: "https://www.snapchat.com/add/gr8_trend",
} as const;

export const CREDIT_NAME = "Razain";

/** The settings keys this module reads. Same strings the admin writes. */
export const CONTACT_SETTING_KEYS = [
  "contact.email",
  "contact.phone",
  "contact.whatsapp",
  "contact.address_ar",
  "contact.address_en",
  "contact.hours_ar",
  "contact.hours_en",
  "social.facebook",
  "social.instagram",
  "social.tiktok",
  "social.youtube",
  "social.snapchat",
] as const;

type SocialKey = keyof typeof DEFAULT_SOCIAL_URLS;

export type SocialLink = {
  href: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
};

export type SiteContact = {
  email: string;
  /** Digits only, for the wa.me deep link. */
  whatsappNumber: string;
  /** wa.me deep link — opens a chat directly in the WhatsApp app or web. */
  whatsappHref: string;
  /** Human-readable number, for display. */
  phoneDisplay: string;
  /** tel: link for the displayed number, or null when there is no number. */
  phoneHref: string | null;
  /** Free text in the reader's language — street address, showroom, etc. */
  address: string;
  /** Free text in the reader's language — opening hours. */
  hours: string;
  socials: SocialLink[];
};

const SOCIAL_ICONS: Record<SocialKey, SocialLink["Icon"]> = {
  facebook: FacebookIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  instagram: InstagramIcon,
  snapchat: SnapchatIcon,
};

const SOCIAL_LABELS: Record<SocialKey, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  snapchat: "Snapchat",
};

/** Settings are free-form JSON, so anything that is not usable text is
 *  treated as unset rather than rendered as "null" or "[object Object]". */
function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** Builds the contact block from public settings, falling back per key. */
export function contactFromSettings(
  settings: Record<string, unknown>,
  locale: Locale,
): SiteContact {
  const whatsappNumber = text(
    settings["contact.whatsapp"],
    DEFAULT_WHATSAPP_NUMBER,
  ).replace(/[^\d]/g, "");
  const phoneDisplay = text(settings["contact.phone"], DEFAULT_PHONE_DISPLAY);
  const phoneDigits = phoneDisplay.replace(/[^\d+]/g, "");

  const socials: SocialLink[] = [];
  if (whatsappNumber) {
    socials.push({
      href: `https://wa.me/${whatsappNumber}`,
      label: "WhatsApp",
      Icon: WhatsappIcon,
    });
  }
  for (const key of Object.keys(SOCIAL_ICONS) as SocialKey[]) {
    // An empty setting removes the icon rather than linking nowhere — that is
    // how staff turn off a channel they do not have.
    const href = text(settings[`social.${key}`], DEFAULT_SOCIAL_URLS[key]);
    if (href) socials.push({ href, label: SOCIAL_LABELS[key], Icon: SOCIAL_ICONS[key] });
  }
  // Facebook first, WhatsApp second, the way the bar has always read.
  socials.sort((a, b) => {
    const order = ["Facebook", "WhatsApp", "TikTok", "YouTube", "Instagram", "Snapchat"];
    return order.indexOf(a.label) - order.indexOf(b.label);
  });

  return {
    email: text(settings["contact.email"], DEFAULT_CONTACT_EMAIL),
    whatsappNumber,
    whatsappHref: whatsappNumber ? `https://wa.me/${whatsappNumber}` : "",
    phoneDisplay,
    phoneHref: phoneDigits ? `tel:${phoneDigits}` : null,
    address: text(settings[`contact.address_${locale}`]),
    hours: text(settings[`contact.hours_${locale}`]),
    socials,
  };
}

/** Server-side convenience: fetch the settings and resolve them in one call. */
export async function getSiteContact(locale: Locale): Promise<SiteContact> {
  const settings = await getPublicSettings(locale);
  return contactFromSettings(settings, locale);
}
