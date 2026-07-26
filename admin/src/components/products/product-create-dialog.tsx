"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TranslationNameFields } from "@/components/translations-fields"
import { brandsApi, productsApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedName } from "@/lib/format"
import { PRODUCT_TYPE_VALUES, humanizeStatus } from "@/lib/status"
import { queryKeys } from "@/lib/query/keys"
import { useRouter } from "@/i18n/navigation"

const NO_BRAND = "__none__"
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/

function useProductSchema() {
  const cat = useTranslations("catalog")
  const p = useTranslations("products")
  return z
    .object({
      brand_id: z.string(),
      product_type: z.string().min(1),
      // Kept as a string end-to-end: money is NUMERIC(12,2) and must never
      // round-trip through a JS float.
      base_price: z.string().regex(MONEY_PATTERN, p("hints.basePrice")),
      translations: z.object({
        ar: z.object({ name: z.string(), slug: z.string() }),
        en: z.object({ name: z.string(), slug: z.string() }),
      }),
    })
    .refine(
      (v) => v.translations.ar.name.trim() || v.translations.en.name.trim(),
      { message: cat("validation.nameRequired"), path: ["translations.en.name"] }
    )
}

type FormValues = z.infer<ReturnType<typeof useProductSchema>>
const FIELD_NAMES = ["brand_id", "product_type", "base_price"] as const

export function ProductCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const locale = useLocale()
  const schema = useProductSchema()
  const queryClient = useQueryClient()
  const router = useRouter()

  const brandsQuery = useQuery({
    queryKey: queryKeys.brands.list({ is_active: true }),
    queryFn: ({ signal }) => brandsApi.list({ limit: 100, is_active: true }, signal),
    enabled: open,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand_id: NO_BRAND,
      product_type: PRODUCT_TYPE_VALUES[0],
      base_price: "",
      translations: {
        ar: { name: "", slug: "" },
        en: { name: "", slug: "" },
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
      const product = await productsApi.create({
        brand_id: values.brand_id === NO_BRAND ? null : Number(values.brand_id),
        product_type: values.product_type,
        base_price: values.base_price,
        translations,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      toast.success(t("created"))
      onOpenChange(false)
      // Straight to the detail page — variants and media are set up there.
      router.push(`/products/${product.id}`)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
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
                    <Input dir="ltr" inputMode="decimal" placeholder="349.00" {...field} />
                  </FormControl>
                  <FormDescription>{t("hints.basePrice")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground">
              {t("hints.defaultVariant")}
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {c("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? c("creating") : c("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
