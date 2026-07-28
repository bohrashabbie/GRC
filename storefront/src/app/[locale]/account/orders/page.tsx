import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { OrderStatusBadge } from "@/components/account/order-status";
import { ChevronForwardIcon } from "@/components/ui/icons";
import { accountOrders } from "@/app/actions";
import { formatDate, formatPrice } from "@/lib/format";
import type { Locale } from "@/i18n/routing";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("orders"), robots: { index: false, follow: false } };
}

export default async function OrdersPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const [t, tOrders, orders] = await Promise.all([
    getTranslations("account"),
    getTranslations("orders"),
    accountOrders(typedLocale),
  ]);

  if (orders.length === 0) {
    return <p className="py-16 text-center text-sm text-ink-500">{t("ordersEmpty")}</p>;
  }

  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/account/orders/${order.order_number}`}
            className="group flex flex-wrap items-center gap-4 py-5 transition-colors hover:bg-sand-100/60"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="tabular text-sm font-medium text-ink-900" dir="ltr">
                  {order.order_number}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-1.5 text-2xs text-ink-400">
                {tOrders("placedOn", { date: formatDate(order.placed_at, typedLocale) })} ·{" "}
                {tOrders("items", { count: order.item_count })}
              </p>
            </div>

            <span className="tabular text-sm font-semibold text-ink-900">
              {formatPrice(order.grand_total, typedLocale)}
            </span>

            <ChevronForwardIcon className="size-4 flip-rtl text-ink-400 transition-[translate] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
