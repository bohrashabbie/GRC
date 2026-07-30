"use client"

import { useTranslations } from "next-intl"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/format"
import type { TopProductOut } from "@/lib/api/types"

export function TopProductsList({
  products,
  locale,
}: {
  products: TopProductOut[]
  locale: string
}) {
  const t = useTranslations("dashboard")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("charts.topProducts")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {products.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{t("noData")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {products.map((product, index) => (
              <div
                key={product.product_id}
                className="flex items-center justify-between gap-3 px-6 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("unitsSold", { count: product.units_sold })}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                  {formatMoney(product.revenue, locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
