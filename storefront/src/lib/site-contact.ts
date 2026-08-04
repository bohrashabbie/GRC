import {
  FacebookIcon,
  InstagramIcon,
  SnapchatIcon,
  TiktokIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@/components/ui/icons";

/**
 * Every off-site contact detail in one place, so changing a number or link
 * never means hunting through layout components. The top bar, footer and the
 * floating WhatsApp button all read from here.
 */

export const CONTACT_EMAIL = "afezzy@gmail.com";

// International format, digits only — Kuwait country code + the store mobile.
export const WHATSAPP_NUMBER = "96597275271";

/** wa.me deep link — opens a chat directly in the WhatsApp app or web. */
export const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}`;

/** Shown next to the WhatsApp link; keep LTR even in the Arabic layout. */
export const WHATSAPP_DISPLAY = "+965 9727 5271";

export const FACEBOOK_URL =
  "https://www.facebook.com/profile.php?id=61592648282235";

export const TIKTOK_URL = "https://www.tiktok.com/@gr8_trend";

export const YOUTUBE_URL = "https://www.youtube.com/@Gr8Trend";

export const INSTAGRAM_URL = "https://www.instagram.com/gr8_trend";

export const SNAPCHAT_URL = "https://www.snapchat.com/add/gr8_trend";

export const CREDIT_NAME = "burhanicreation.com";
export const CREDIT_URL = "https://www.burhanicreation.com";

export const SOCIALS = [
  { href: FACEBOOK_URL, label: "Facebook", Icon: FacebookIcon },
  { href: WHATSAPP_HREF, label: "WhatsApp", Icon: WhatsappIcon },
  { href: TIKTOK_URL, label: "TikTok", Icon: TiktokIcon },
  { href: YOUTUBE_URL, label: "YouTube", Icon: YoutubeIcon },
  { href: INSTAGRAM_URL, label: "Instagram", Icon: InstagramIcon },
  { href: SNAPCHAT_URL, label: "Snapchat", Icon: SnapchatIcon },
];
