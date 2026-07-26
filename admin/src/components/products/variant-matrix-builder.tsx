"use client"

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ListLoadingSkeleton } from "@/components/states/list-states"
import { optionsApi, optionValuesApi, productsApi } from "@/lib/api/endpoints"
import { isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedLabel } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { OptionValueOut, VariantOut } from "@/lib/api/types"

/** Matches the backend's hard cap in variant generation. */
const VARIANT_LIMIT = 300

type SelectedValues = Record<number, Set<number>>

/**
 * Lets the user pick which option values participate, previews the resulting
 * combinations, and submits them explicitly. The backend never builds a
 * cartesian product on its own — the combinations are sent one by one — and
 * rejects anything over 300 variants for a single product.
 */
export function VariantMatrixBuilder({
  productId,
  existingVariants,
}: {
  productId: number
  existingVariants: VariantOut[]
}) {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [selected, setSelected] = useState<SelectedValues>({})
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const optionsQuery = useQuery({
    queryKey: queryKeys.options.list(),
    queryFn: ({ signal }) => optionsApi.list({ limit: 50 }, signal),
  })
  // Memoised so the `?? []` fallback doesn't produce a new array identity on
  // every render and invalidate the memos below.
  const options = useMemo(
    () => optionsQuery.data?.items ?? [],
    [optionsQuery.data]
  )

  // One values query per option, so the matrix can show every option's values.
  const valueQueries = useQueries({
    queries: options.map((option) => ({
      queryKey: queryKeys.options.values(option.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        optionValuesApi.list({ option_id: option.id, limit: 100 }, signal),
    })),
  })

  const valuesByOption = useMemo(() => {
    const map = new Map<number, OptionValueOut[]>()
    options.forEach((option, index) => {
      const data = valueQueries[index]?.data
      if (data) {
        map.set(
          option.id,
          [...data.items].sort((a, b) => a.sort_order - b.sort_order)
        )
      }
    })
    return map
  }, [options, valueQueries])

  /** Cartesian product of only the option values the user actually ticked. */
  const combinations = useMemo(() => {
    const activeGroups = options
      .map((option) => [...(selected[option.id] ?? [])])
      .filter((group) => group.length > 0)

    if (activeGroups.length === 0) return []

    return activeGroups.reduce<number[][]>(
      (acc, group) => acc.flatMap((combo) => group.map((id) => [...combo, id])),
      [[]]
    )
  }, [options, selected])

  // Combinations that already exist as variants are skipped rather than
  // resubmitted, so re-running the builder doesn't error on duplicates.
  const existingKeys = useMemo(
    () =>
      new Set(
        existingVariants.map((v) => [...v.option_value_ids].sort((a, b) => a - b).join("-"))
      ),
    [existingVariants]
  )

  const newCombinations = combinations.filter(
    (combo) => !existingKeys.has([...combo].sort((a, b) => a - b).join("-"))
  )

  const overLimit = existingVariants.length + newCombinations.length > VARIANT_LIMIT

  function toggleValue(optionId: number, valueId: number, checked: boolean) {
    setInlineError(null)
    setSelected((prev) => {
      const next = { ...prev }
      const group = new Set(next[optionId] ?? [])
      if (checked) group.add(valueId)
      else group.delete(valueId)
      next[optionId] = group
      return next
    })
  }

  async function handleGenerate() {
    setInlineError(null)
    if (overLimit) {
      setInlineError(t("variants.limitExceeded"))
      return
    }
    setIsSubmitting(true)
    try {
      const created = await productsApi.generateVariants(productId, {
        combinations: newCombinations.map((option_value_ids) => ({
          option_value_ids,
        })),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.products.variants(productId),
      })
      toast.success(t("variants.generated", { count: created.length }))
      setSelected({})
    } catch (error) {
      // Business-rule violations (the 300 cap) are shown inline next to the
      // action, not just toasted — the user has to change the selection.
      if (isApiError(error) && error.isBusinessRule) {
        setInlineError(error.message)
        return
      }
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (optionsQuery.isLoading) return <ListLoadingSkeleton rows={4} />

  if (options.length === 0) {
    return (
      <Alert>
        <AlertDescription>{t("variants.noOptions")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">
          {t("variants.matrixTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("variants.matrixDescription")}
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {options.map((option) => {
          const values = valuesByOption.get(option.id) ?? []
          if (values.length === 0) return null

          return (
            <div key={option.id} className="flex flex-col gap-2 p-4">
              <h4 className="text-sm font-medium text-foreground">
                {translatedLabel(option.translations, locale)}
              </h4>
              <div className="flex flex-wrap gap-3">
                {values.map((value) => (
                  <div key={value.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`vm-${value.id}`}
                      checked={selected[option.id]?.has(value.id) ?? false}
                      onCheckedChange={(checked) =>
                        toggleValue(option.id, value.id, checked === true)
                      }
                    />
                    <Label htmlFor={`vm-${value.id}`} className="font-normal">
                      {value.hex_color && (
                        <span
                          aria-hidden
                          className="me-1 inline-block size-3 rounded-full border border-border align-middle"
                          style={{ backgroundColor: value.hex_color }}
                        />
                      )}
                      {translatedLabel(value.translations, locale)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Shown as soon as the selection goes over the cap, not only after a
          failed submit, so the user can correct it before trying. */}
      {(inlineError || overLimit) && (
        <Alert variant="destructive">
          <AlertDescription>
            {inlineError ?? t("variants.limitExceeded")}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs text-muted-foreground">
          {t("variants.selectedCount", { count: newCombinations.length })}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={newCombinations.length === 0 || isSubmitting || overLimit}
          onClick={handleGenerate}
        >
          {isSubmitting ? t("variants.generating") : t("variants.generate")}
        </Button>
      </div>
    </div>
  )
}
