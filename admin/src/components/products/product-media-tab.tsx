"use client"

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Star } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { mediaApi, optionsApi, optionValuesApi, productsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { mediaUrl, translatedLabel } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { OptionValueOut } from "@/lib/api/types"

const NO_COLOUR = "__none__"

/** Colour swatches are the only option values worth tagging media to. */
const COLOUR_OPTION_CODES = ["colour", "color"]

export function ProductMediaTab({ productId }: { productId: number }) {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [colourValueId, setColourValueId] = useState(NO_COLOUR)
  const [isPrimary, setIsPrimary] = useState(false)

  const mediaQuery = useQuery({
    queryKey: queryKeys.products.media(productId),
    queryFn: ({ signal }) => productsApi.listMedia(productId, signal),
  })

  const optionsQuery = useQuery({
    queryKey: queryKeys.options.list(),
    queryFn: ({ signal }) => optionsApi.list({ limit: 50 }, signal),
  })
  const colourOptions = (optionsQuery.data?.items ?? []).filter((o) =>
    COLOUR_OPTION_CODES.includes(o.code.toLowerCase())
  )

  const colourValueQueries = useQueries({
    queries: colourOptions.map((option) => ({
      queryKey: queryKeys.options.values(option.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        optionValuesApi.list({ option_id: option.id, limit: 100 }, signal),
    })),
  })
  const colourValues: OptionValueOut[] = colourValueQueries.flatMap(
    (q) => q.data?.items ?? []
  )

  // Base UI renders the raw value in the trigger unless it can map it to a
  // label, so the options are declared once and passed to the Select root.
  const colourItems = [
    { value: NO_COLOUR, label: t("media.noColour") },
    ...colourValues.map((v) => ({
      value: String(v.id),
      label: translatedLabel(v.translations, locale),
    })),
  ]

  const colourLabel = (optionValueId: number | null) => {
    if (optionValueId === null) return null
    const value = colourValues.find((v) => v.id === optionValueId)
    return value ? translatedLabel(value.translations, locale) : `#${optionValueId}`
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const media = await mediaApi.upload(file)
      try {
        await mediaApi.attach(media.id, {
          product_id: productId,
          option_value_id:
            colourValueId === NO_COLOUR ? null : Number(colourValueId),
          is_primary: isPrimary,
        })
        await queryClient.invalidateQueries({
          queryKey: queryKeys.products.media(productId),
        })
        toast.success(t("media.uploaded"))
        setIsPrimary(false)
      } catch (error) {
        // The file is stored even if the attach failed, so say that rather
        // than implying the whole upload was lost.
        toast.error(getErrorMessage(error, t("media.attachFailed")))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const items = mediaQuery.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("media.title")}</CardTitle>
        <CardDescription>{t("media.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <Label>{t("media.tagToColour")}</Label>
            <Select
              items={colourItems}
              value={colourValueId}
              onValueChange={(v) => setColourValueId((v as string) ?? NO_COLOUR)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colourItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2.5 pb-2">
            <Checkbox
              id="media-primary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked === true)}
            />
            <Label htmlFor="media-primary" className="font-normal">
              {t("media.isPrimary")}
            </Label>
          </div>

          <div className="pb-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? t("media.uploading") : t("media.upload")}
            </Button>
          </div>
        </div>

        {mediaQuery.isLoading && <ListLoadingSkeleton rows={3} />}
        {mediaQuery.isError && (
          <ListErrorState
            error={mediaQuery.error}
            onRetry={() => mediaQuery.refetch()}
          />
        )}
        {mediaQuery.data && items.length === 0 && (
          <ListEmptyState description={t("media.empty")} />
        )}

        {items.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const colour = colourLabel(item.option_value_id)
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-1.5 rounded-lg border border-border p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- the
                      API serves uploads from its own origin, outside Next's
                      image optimiser. */}
                  <img
                    src={mediaUrl(item.media.storage_key)}
                    alt={item.media.original_filename ?? ""}
                    loading="lazy"
                    className="aspect-square w-full rounded-md bg-muted object-cover"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.is_primary && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="size-3" aria-hidden />
                        {t("media.isPrimary")}
                      </Badge>
                    )}
                    {colour && <Badge variant="outline">{colour}</Badge>}
                  </div>
                  <span
                    className="truncate text-xs text-muted-foreground"
                    title={item.media.original_filename ?? undefined}
                  >
                    {item.media.original_filename ?? `#${item.media.id}`}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
