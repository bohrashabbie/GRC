import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { OrderStatusBadge, STATUS_KEY } from "@/components/account/order-status";
import { ChevronForwardIcon } from "@/components/ui/icons";
import { accountOrder } from "@/app/actions";
import { addressLines, formatDate, formatPrice } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ locale: string; orderNumber: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, orderNumber } = await params;
  const t = await getTranslations({ locale, namespace: "orders" });
  return {
    title: t("orderNumber", { number: orderNumber }),
    robots: { index: false, follow: false },
  };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const order = await accountOrder(decodeURIComponent(orderNumber), typedLocale);
  if (!order) notFound();

  const [t, tCart] = await Promise.all([getTranslations("orders"), getTranslations("cart")]);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/account/orders"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900"
          >
            <ChevronForwardIcon className="size-3.5 rotate-180 flip-rtl" />
            {t("orderNumber", { number: "" }).trim()}
          </Link>
          <h2 className="tabular font-display text-h2 text-ink-900" dir="ltr">
            {order.order_number}
          </h2>
          <p className="mt-1.5 text-2xs text-ink-400">
            {t("placedOn", { date: formatDate(order.placed_at, typedLocale) })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      {/* Status timeline. The connector is drawn with a logical border so the
          rail sits on the correct side of the dots in both directions. */}
      <ol className="space-y-0">
        {order.timeline.map((event, index) => {
          const isLast = index === order.timeline.length - 1;
          return (
            <li key={event.status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    isLast ? "bg-palm-600 ring-4 ring-palm-600/15" : "bg-sand-300",
                  )}
                />
                {!isLast && <span className="w-px flex-1 bg-sand-300" />}
              </div>
              <div className={cn("pb-6", isLast && "pb-0")}>
                <p
                  className={cn(
                    "text-sm",
                    isLast ? "font-medium text-ink-900" : "text-ink-500",
                  )}
                >
                  {t(STATUS_KEY[event.status])}
                </p>
                <p className="mt-0.5 text-2xs text-ink-400">
                  {formatDate(event.occurred_at, typedLocale)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {order.tracking_number && (
        <div className="border border-hairline bg-surface p-5">
          <p className="eyebrow">{t("trackingNumber")}</p>
          <p className="tabular mt-1.5 text-sm text-ink-900" dir="ltr">
            {order.tracking_number}
          </p>
          {order.tracking_url && (
            <a
              href={order.tracking_url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-block text-xs text-gold-700 underline underline-offset-4"
            >
              {t("trackShipment")}
            </a>
          )}
        </div>
      )}

      <section>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {order.lines.map((line) => (
            <li key={line.id} className="flex gap-4 py-5">
              <span className="w-20 shrink-0 bg-sand-100">
                {line.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.image.url} alt="" className="aspect-[2/3] w-full object-cover" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                {/* Snapshots, not live catalogue joins — an order must render
                    the same way years later even if the product changed. */}
                <p className="text-sm text-ink-800">{line.name_snapshot}</p>
                {line.options_snapshot && (
                  <p className="mt-0.5 text-2xs text-ink-400">{line.options_snapshot}</p>
                )}
                <p className="tabular mt-0.5 text-2xs text-ink-400" dir="ltr">
                  {line.sku_snapshot} × {line.quantity}
                </p>
              </div>
              <span className="tabular shrink-0 text-sm font-semibold text-ink-900">
                {formatPrice(line.line_total, typedLocale)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="eyebrow mb-3">{t("deliveryAddress")}</h3>
          <address className="text-sm not-italic leading-relaxed text-ink-600">
            {order.shipping_address.full_name}
            {addressLines(order.shipping_address).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span dir="ltr">{order.shipping_address.phone}</span>
          </address>

          <h3 className="eyebrow mt-6 mb-2">{t("shippingMethod")}</h3>
          <p className="text-sm text-ink-600">{order.shipping_method_name}</p>

          <h3 className="eyebrow mt-6 mb-2">{t("paymentMethod")}</h3>
          <p className="text-sm text-ink-600">{order.payment_method_name}</p>
        </div>

        <div className="space-y-2.5 border border-hairline bg-surface p-5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">{tCart("subtotal")}</span>
            <span className="tabular text-ink-800">
              {formatPrice(order.totals.subtotal, typedLocale)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">{tCart("shipping")}</span>
            <span className="tabular text-ink-800">
              {Number(order.totals.shipping_total) === 0
                ? tCart("shippingFree")
                : formatPrice(order.totals.shipping_total, typedLocale)}
            </span>
          </div>
          <div className="flex justify-between border-t border-hairline pt-3">
            <span className="text-sm font-semibold text-ink-900">{tCart("total")}</span>
            <span className="tabular text-lg font-semibold text-ink-900">
              {formatPrice(order.totals.grand_total, typedLocale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
