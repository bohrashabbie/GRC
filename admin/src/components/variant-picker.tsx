"use client"

import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { productsApi } from "@/lib/api/endpoints"
import { translatedName } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { VariantOut } from "@/lib/api/types"

/**
 * Two-step product → variant picker.
 *
 * The API exposes no variant/SKU search endpoint, so a variant can only be
 * reached through its product. Every screen that needs a variant (stock,
 * transfers, counts, purchase orders) uses this rather than each inventing
 * its own workaround.
 */
export function VariantPicker({
  value,
  onChange,
  productLabel,
  variantLabel,
}: {
  value: number | null
  onChange: (variant: VariantOut | null) => void
  productLabel?: string
  variantLabel?: string
}) {
  const t = useTranslations("stock")
  const locale = useLocale()
  const [productId, setProductId] = useState<number | null>(null)

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({}),
    queryFn: ({ signal }) => productsApi.list({ limit: 100 }, signal),
  })

  const variantsQuery = useQuery({
    queryKey: queryKeys.products.variants(productId ?? 0),
    queryFn: ({ signal }) => productsApi.listVariants(productId!, signal),
    enabled: productId !== null,
  })

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label>{productLabel ?? t("pickProduct")}</Label>
        <Select
          value={productId === null ? "" : String(productId)}
          onValueChange={(next) => {
            setProductId(next ? Number(next) : null)
            onChange(null)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("pickProductFirst")} />
          </SelectTrigger>
          <SelectContent>
            {(productsQuery.data?.items ?? []).map((product) => (
              <SelectItem key={product.id} value={String(product.id)}>
                {translatedName(product.translations, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{variantLabel ?? t("pickVariant")}</Label>
        <Select
          value={value === null ? "" : String(value)}
          onValueChange={(next) => {
            const variant =
              (variantsQuery.data ?? []).find((v) => String(v.id) === next) ??
              null
            onChange(variant)
          }}
          disabled={productId === null}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("pickVariantPrompt")} />
          </SelectTrigger>
          <SelectContent>
            {(variantsQuery.data ?? []).map((variant) => (
              <SelectItem key={variant.id} value={String(variant.id)}>
                {variant.sku}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
