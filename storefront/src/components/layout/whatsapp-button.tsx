import { useTranslations } from "next-intl";

import { WhatsappIcon } from "@/components/ui/icons";
import { WHATSAPP_HREF } from "@/lib/site-contact";

/**
 * Floating "chat with us" button, present on every page. Official WhatsApp
 * brand green rather than a palette token — it should read as WhatsApp, not
 * as part of our color system.
 *
 * Sits above the fixed mobile bottom nav (~64px, z-40) on small screens and
 * drops to the corner once the nav disappears at md. `end-*` keeps it on the
 * natural reading side in both RTL and LTR. z-40 keeps it under the cart
 * drawer and mobile menu overlays (z-50).
 */
export function WhatsappButton() {
  const t = useTranslations("footer");

  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t("chatOnWhatsapp")}
      title={t("chatOnWhatsapp")}
      className="fixed bottom-20 end-4 z-40 inline-flex size-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 md:bottom-6 md:end-6"
    >
      <WhatsappIcon className="size-7" />
    </a>
  );
}
