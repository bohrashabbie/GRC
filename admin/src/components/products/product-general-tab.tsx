"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { TranslationNameFields } from "@/components/translations-fields"
import { useRouter } from "@/i18n/navigation"
import { usePermission } from "@/hooks/use-permission"
import { brandsApi, categoriesApi, productsApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedName } from "@/lib/format"
import { PRODUCT_TYPE_VALUES, humanizeStatus } from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { ProductOut } from "@/lib/api/types"

const NO_BRAND = "__none__"
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/

function useProductEditSchema() {
  const p = useTranslations("products")
  return z.object({
    brand_id: z.string(),
    product_type: z.string().min(1),
    base_price: z.string().regex(MONEY_PATTERN, p("hints.basePrice")),
    is_featured: z.boolean(),
    is_best_seller: z.boolean(),
    translations: z.object({
      ar: z.object({ name: z.string(), slug: z.string() }),
      en: z.object({ name: z.string(), slug: z.string() }),
    }),
  })
}

type FormValues = z.infer<ReturnType<typeof useProductEditSchema>>
const FIELD_NAMES = ["brand_id", "product_type", "base_price"] as const

export function ProductGeneralTab({ product }: { product: ProductOut }) {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const locale = useLocale()
  const schema = useProductEditSchema()
  const queryClient = useQueryClient()
  const router = useRouter()
  const canManage = usePermission(PERMISSIONS.catalogManage)

  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(
    new Set(product.category_ids)
  )

  const brandsQuery = useQuery({
    queryKey: queryKeys.brands.list({ is_active: true }),
    queryFn: ({ signal }) => brandsApi.list({ limit: 100, is_active: true }, signal),
  })
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.list({ is_active: true }),
    queryFn: ({ signal }) => categoriesApi.list({ limit: 100, is_active: true }, signal),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand_id: product.brand_id ? String(product.brand_id) : NO_BRAND,
      product_type: product.product_type,
      base_price: product.base_price,
      is_featured: product.is_featured,
      is_best_seller: product.is_best_seller,
      translations: {
        ar: {
          name: product.translations.find((x) => x.locale === "ar")?.name ?? "",
          slug: product.translations.find((x) => x.locale === "ar")?.slug ?? "",
        },
        en: {
          name: product.translations.find((x) => x.locale === "en")?.name ?? "",
          slug: product.translations.find((x) => x.locale === "en")?.slug ?? "",
        },
      },
    },
  })

  async function onSubmit(values: FormValues) {
    const translations = (["ar", "en"] as const)
      .filter((l) => values.translations[l].name.trim())
      .map((l) => ({
        locale: l,
        name: values.translations[l].name.trim(),
        slug: values.translations[l].slug.trim() || null,
      }))

    try {
      await productsApi.update(product.id, {
        brand_id: values.brand_id === NO_BRAND ? null : Number(values.brand_id),
        product_type: values.product_type,
        base_price: values.base_price,
        is_featured: values.is_featured,
        is_best_seller: values.is_best_seller,
        category_ids: [...selectedCategories],
        translations,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      toast.success(t("updated"))
      // Saving ends the edit, so return to the list rather than leaving the
      // form open with no signal that anything happened beyond the toast.
      router.push("/products")
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        const unmatched = applyFieldErrors(error, form.setError, FIELD_NAMES)
        if (unmatched.length > 0) {
          toast.error(unmatched.map((f) => f.message).join(" "))
        }
        return
      }
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  function toggleCategory(id: number, checked: boolean) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("tabs.general")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TranslationNameFields control={form.control} showSlug />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="product_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.productType")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? field.value)}
                      disabled={!canManage}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_TYPE_VALUES.map((pt) => (
                          <SelectItem key={pt} value={pt}>
                            {humanizeStatus(pt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.brand")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? NO_BRAND)}
                      disabled={!canManage}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_BRAND}>
                          {t("fields.noBrand")}
                        </SelectItem>
                        {(brandsQuery.data?.items ?? []).map((brand) => (
                          <SelectItem key={brand.id} value={String(brand.id)}>
                            {translatedName(brand.translations, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="base_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.basePrice")}</FormLabel>
                  <FormControl>
                    <Input dir="ltr" inputMode="decimal" disabled={!canManage} {...field} />
                  </FormControl>
                  <FormDescription>{t("hints.basePrice")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="prod-featured">{t("fields.isFeatured")}</Label>
                    <FormControl>
                      <Switch
                        id="prod-featured"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canManage}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_best_seller"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="prod-best-seller">
                        {t("fields.isBestSeller")}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {t("hints.isBestSeller")}
                      </span>
                    </div>
                    <FormControl>
                      <Switch
                        id="prod-best-seller"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canManage}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("fields.categories")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {t("hints.categories")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(categoriesQuery.data?.items ?? []).map((category) => (
                <div key={category.id} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`prod-cat-${category.id}`}
                    checked={selectedCategories.has(category.id)}
                    onCheckedChange={(checked) =>
                      toggleCategory(category.id, checked === true)
                    }
                    disabled={!canManage}
                  />
                  <Label
                    htmlFor={`prod-cat-${category.id}`}
                    className="font-normal"
                  >
                    {translatedName(category.translations, locale)}
                    <span className="ms-1 text-xs text-muted-foreground">
                      ({category.dimension})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {canManage && (
          <div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? c("saving") : c("save")}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
