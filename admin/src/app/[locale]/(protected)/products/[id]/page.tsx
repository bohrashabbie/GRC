"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { ProductGeneralTab } from "@/components/products/product-general-tab"
import { ProductMediaTab } from "@/components/products/product-media-tab"
import { ProductVariantsTab } from "@/components/products/product-variants-tab"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import { useQueryParam } from "@/hooks/use-query-param"
import { productsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedName } from "@/lib/format"
import { PRODUCT_STATUS_VALUES, humanizeStatus } from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"

export default function ProductDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.catalogView}>
      <ProductDetailContent />
    </RequireRoutePermission>
  )
}

function ProductDetailContent() {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const locale = useLocale()
  const params = useParams<{ id: string }>()
  const productId = Number(params.id)
  const queryClient = useQueryClient()

  // Active tab lives in the URL so a deep link opens the right tab.
  const [tabParam, setTabParam] = useQueryParam("tab")
  const tab = tabParam ?? "general"

  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: ({ signal }) => productsApi.get(productId, signal),
    enabled: Number.isFinite(productId),
  })

  const product = productQuery.data
  const name = product ? translatedName(product.translations, locale) : t("detailTitle")

  async function handleStatusChange(status: string) {
    if (!product || status === product.status) return
    try {
      await productsApi.setStatus(product.id, status)
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      toast.success(t("statusUpdated"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[{ label: t("title"), href: "/products" }, { label: name }]}
      />

      {productQuery.isLoading && <ListLoadingSkeleton rows={6} />}
      {productQuery.isError && (
        <ListErrorState
          error={productQuery.error}
          onRetry={() => productQuery.refetch()}
        />
      )}

      {product && (
        <>
          <PageHeader
            title={name}
            description={t("description")}
            action={
              <div className="flex items-center gap-2">
                <StatusBadge status={product.status} />
                <RequirePermission permission={PERMISSIONS.productPublish}>
                  <Select
                    value={product.status}
                    onValueChange={(next) => next && handleStatusChange(next)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_STATUS_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {humanizeStatus(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </RequirePermission>
              </div>
            }
          />

          <Tabs
            value={tab}
            onValueChange={(next) =>
              setTabParam(!next || next === "general" ? null : String(next))
            }
          >
            <TabsList>
              <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
              <TabsTrigger value="media">{t("tabs.media")}</TabsTrigger>
              <TabsTrigger value="variants">{t("tabs.variants")}</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <ProductGeneralTab key={product.id} product={product} />
            </TabsContent>
            <TabsContent value="media">
              <ProductMediaTab productId={product.id} />
            </TabsContent>
            <TabsContent value="variants">
              <ProductVariantsTab productId={product.id} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
