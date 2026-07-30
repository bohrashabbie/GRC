"use client"

import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import type { LowStockItemOut } from "@/lib/api/types"

export function LowStockList({ items }: { items: LowStockItemOut[] }) {
  const t = useTranslations("dashboard")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("charts.lowStock")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{t("lowStockEmpty")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <Link
                key={item.variant_id}
                href={`/products?q=${encodeURIComponent(item.sku)}`}
                className="flex items-center justify-between gap-3 px-6 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </div>
                <Badge
                  variant={item.on_hand <= 0 ? "destructive" : "secondary"}
                  className="shrink-0 whitespace-nowrap"
                >
                  {t("onHandOfThreshold", { onHand: item.on_hand, threshold: item.threshold })}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
