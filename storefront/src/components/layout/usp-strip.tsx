import { useTranslations } from "next-intl";

import { ReturnIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";

/**
 * Static copy by design — this is a brand promise, not merchandising, and
 * putting it behind a CMS table would mean a migration for a sentence that
 * changes once a year.
 */
export function UspStrip() {
  const t = useTranslations("usp");

  const items = [
    { Icon: TruckIcon, title: t("shippingTitle"), body: t("shippingBody") },
    { Icon: ReturnIcon, title: t("returnsTitle"), body: t("returnsBody") },
    { Icon: ShieldIcon, title: t("paymentTitle"), body: t("paymentBody") },
  ];

  return (
    <section className="border-y border-hairline bg-sand-100">
      <div className="container-site grid gap-px py-10 sm:grid-cols-3 sm:gap-0">
        {items.map(({ Icon, title, body }, index) => (
          <div
            key={title}
            className={
              index > 0
                ? "flex gap-4 border-t border-hairline-strong pt-6 sm:border-t-0 sm:border-s sm:pt-0 sm:ps-8"
                : "flex gap-4 sm:pe-8"
            }
          >
            <Icon className="size-6 shrink-0 text-gold-500" />
            <div>
              <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
              <p className="mt-1 text-sm text-ink-500">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
