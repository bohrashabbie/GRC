"use client"

import { useQueries, useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { optionsApi, optionValuesApi, productsApi } from "@/lib/api/endpoints"
import { translatedLabel, translatedName } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { OptionValueOut, VariantOut } from "@/lib/api/types"

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
  /** The label is passed along so callers can print the same words the
   *  dropdown showed, without repeating the option lookup. */
  onChange: (variant: VariantOut | null, label?: string) => void
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

  // Option values are looked up so a variant reads as "Navy · L" rather than
  // as the SKU the system generated for it: staff ordering stock know the
  // colour and the size, not P14-22-24.
  const optionsQuery = useQuery({
    queryKey: queryKeys.options.list(),
    queryFn: ({ signal }) => optionsApi.list({ limit: 50 }, signal),
  })
  const valueQueries = useQueries({
    queries: (optionsQuery.data?.items ?? []).map((option) => ({
      queryKey: queryKeys.options.values(option.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        optionValuesApi.list({ option_id: option.id, limit: 100 }, signal),
    })),
  })
  const valueLabelById = useMemo(() => {
    const map = new Map<number, string>()
    for (const query of valueQueries) {
      for (const value of query.data?.items ?? ([] as OptionValueOut[])) {
        map.set(value.id, translatedLabel(value.translations, locale))
      }
    }
    return map
  }, [valueQueries, locale])

  /** What this variant is, in words: its option values, or the product's own
   *  name when it is a plain product with a single variant. */
  function variantLabelFor(variant: VariantOut): string {
    if (variant.option_value_ids.length > 0) {
      return variant.option_value_ids
        .map((id) => valueLabelById.get(id) ?? `#${id}`)
        .join(" · ")
    }
    const product = (productsQuery.data?.items ?? []).find(
      (item) => item.id === variant.product_id
    )
    return product ? translatedName(product.translations, locale) : variant.sku
  }

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
            onChange(variant, variant ? variantLabelFor(variant) : undefined)
          }}
          disabled={productId === null}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("pickVariantPrompt")} />
          </SelectTrigger>
          <SelectContent>
            {(variantsQuery.data ?? []).map((variant) => (
              <SelectItem key={variant.id} value={String(variant.id)}>
                {variantLabelFor(variant)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
