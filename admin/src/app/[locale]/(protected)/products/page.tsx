"use client"

import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { ProductCreateDialog } from "@/components/products/product-create-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { useQueryParam } from "@/hooks/use-query-param"
import { brandsApi, productsApi } from "@/lib/api/endpoints"
import { formatMoney, mediaUrl, translatedName } from "@/lib/format"
import {
  PRODUCT_STATUS_VALUES,
  PRODUCT_TYPE_VALUES,
  humanizeStatus,
} from "@/lib/status"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { useRouter } from "@/i18n/navigation"
import type { ProductOut } from "@/lib/api/types"

const ANY = "__any__"

export default function ProductsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.catalogView}>
      <ProductsContent />
    </RequireRoutePermission>
  )
}

function ProductsContent() {
  const t = useTranslations("products")
  const c = useTranslations("common")
  const locale = useLocale()
  const format = useFormatter()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  const [statusParam, setStatusParam] = useQueryParam("status")
  const [searchParam, setSearchParam] = useQueryParam("q")
  const [brandParam, setBrandParam] = useQueryParam("brand")
  const [typeParam, setTypeParam] = useQueryParam("type")
  const [offerParam, setOfferParam] = useQueryParam("offer")

  const status = statusParam ?? null
  const search = searchParam ?? null
  const brandId = brandParam ? Number(brandParam) : null
  const productType = typeParam ?? null
  const isOnOffer = offerParam === "true" ? true : offerParam === "false" ? false : null

  const brandsQuery = useQuery({
    queryKey: queryKeys.brands.list({ is_active: true }),
    queryFn: ({ signal }) => brandsApi.list({ limit: 100, is_active: true }, signal),
  })
  const brands = brandsQuery.data?.items ?? []

  const list = useCursorList<ProductOut>({
    queryKey: queryKeys.products.list({
      status,
      q: search,
      brand_id: brandId,
      product_type: productType,
      is_on_offer: isOnOffer,
    }),
    fetchPage: (cursor, signal) =>
      productsApi.list(
        {
          cursor,
          limit: 20,
          status,
          q: search,
          brand_id: brandId,
          product_type: productType,
          is_on_offer: isOnOffer,
        },
        signal
      ),
  })

  const brandName = (id: number | null) => {
    if (id === null) return "—"
    const brand = brands.find((b) => b.id === id)
    return brand ? translatedName(brand.translations, locale) : `#${id}`
  }

  const columns: ColumnDef<ProductOut, unknown>[] = [
    {
      id: "image",
      header: "",
      cell: ({ row }) =>
        row.original.primary_image_key ? (
          // Served from the API's own origin, outside Next's image optimiser,
          // so this stays a plain img like the rest of the admin.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(row.original.primary_image_key)}
            alt=""
            loading="lazy"
            className="h-11 w-11 rounded-md border border-border object-cover"
          />
        ) : (
          <div
            className="h-11 w-11 rounded-md border border-dashed border-border"
            aria-hidden="true"
          />
        ),
    },
    {
      id: "name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {translatedName(row.original.translations, locale)}
        </span>
      ),
    },
    {
      id: "brand",
      header: t("columns.brand"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {brandName(row.original.brand_id)}
        </span>
      ),
    },
    {
      accessorKey: "product_type",
      header: t("columns.type"),
      cell: ({ row }) => humanizeStatus(row.original.product_type),
    },
    {
      accessorKey: "status",
      header: t("columns.status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "base_price",
      header: t("columns.basePrice"),
      cell: ({ row }) => formatMoney(row.original.base_price, locale),
    },
    {
      id: "offer",
      header: t("columns.offer"),
      cell: ({ row }) =>
        row.original.is_on_offer ? <Badge variant="secondary">{t("offer")}</Badge> : "—",
    },
    {
      id: "stock",
      header: t("columns.stock"),
      // Total across the product's variants, with the badge reflecting the
      // worst variant rather than the total — 40 in stock is no comfort when
      // the size the customer wants is the one at zero.
      cell: ({ row }) => {
        const product = row.original
        if (!product.track_inventory) {
          return (
            <Badge variant="outline" className="whitespace-nowrap">
              {t("variants.untracked")}
            </Badge>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{product.stock_quantity ?? 0}</span>
            {product.stock_state === "out_of_stock" && (
              <Badge variant="destructive" className="whitespace-nowrap">
                {t("variants.outOfStock")}
              </Badge>
            )}
            {product.stock_state === "low_stock" && (
              <Badge variant="secondary" className="whitespace-nowrap">
                {t("variants.lowStock")}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: t("columns.created"),
      cell: ({ row }) =>
        format.dateTime(new Date(row.original.created_at), "short"),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.catalogManage}>
            <Button onClick={() => setCreateOpen(true)}>{t("newProduct")}</Button>
          </RequirePermission>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search ?? ""}
          onChange={(event) => setSearchParam(event.target.value || null)}
          placeholder={t("searchPlaceholder")}
          className="w-64"
        />
        <Select
          value={status ?? ANY}
          onValueChange={(next) =>
            setStatusParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            {PRODUCT_STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {humanizeStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={brandId === null ? ANY : String(brandId)}
          onValueChange={(next) =>
            setBrandParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filters.brand")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={String(brand.id)}>
                {translatedName(brand.translations, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={productType ?? ANY}
          onValueChange={(next) =>
            setTypeParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            {PRODUCT_TYPE_VALUES.map((pt) => (
              <SelectItem key={pt} value={pt}>
                {humanizeStatus(pt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={offerParam ?? ANY}
          onValueChange={(next) =>
            setOfferParam(!next || next === ANY ? null : next)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.offer")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{c("all")}</SelectItem>
            <SelectItem value="true">{t("filters.onOffer")}</SelectItem>
            <SelectItem value="false">{t("filters.notOnOffer")}</SelectItem>
          </SelectContent>
        </Select>

      </div>

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(product) => router.push(`/products/${product.id}`)}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />

      {createOpen && (
        <ProductCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </div>
  )
}
