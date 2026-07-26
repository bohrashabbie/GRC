import { useTranslations } from "next-intl";

import type { OrderStatus } from "@/types/shop";
import { cn } from "@/lib/utils";

const STATUS_KEY: Record<OrderStatus, string> = {
  pending: "statusPending",
  confirmed: "statusConfirmed",
  processing: "statusProcessing",
  shipped: "statusShipped",
  delivered: "statusDelivered",
  cancelled: "statusCancelled",
  returned: "statusReturned",
};

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-sand-200 text-ink-700",
  confirmed: "bg-sand-200 text-ink-700",
  processing: "bg-gold-300/45 text-gold-700",
  shipped: "bg-palm-600/12 text-palm-700",
  delivered: "bg-palm-600 text-sand-50",
  cancelled: "bg-brick-600/12 text-brick-600",
  returned: "bg-brick-600/12 text-brick-600",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("orders");

  return (
    <span className={cn("inline-flex px-2.5 py-1 text-2xs font-medium", STATUS_TONE[status])}>
      {t(STATUS_KEY[status])}
    </span>
  );
}

export { STATUS_KEY };
