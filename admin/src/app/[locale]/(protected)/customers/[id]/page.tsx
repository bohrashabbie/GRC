"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
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
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { usePermission } from "@/hooks/use-permission"
import { customersApi, ordersApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { customerName, formatMoney } from "@/lib/format"
import { locales } from "@/i18n/routing"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { Link } from "@/i18n/navigation"
import type { CustomerOut } from "@/lib/api/types"

const schema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  locale_pref: z.string().min(1),
  accepts_marketing: z.boolean(),
  is_active: z.boolean(),
})
type FormValues = z.infer<typeof schema>
const FIELD_NAMES = ["first_name", "last_name", "locale_pref"] as const

export default function CustomerDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.customerView}>
      <CustomerDetailContent />
    </RequireRoutePermission>
  )
}

function CustomerDetailContent() {
  const t = useTranslations("customers")
  const params = useParams<{ id: string }>()
  const customerId = Number(params.id)

  const customerQuery = useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: ({ signal }) => customersApi.get(customerId, signal),
    enabled: Number.isFinite(customerId),
  })

  const customer = customerQuery.data

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/customers" },
          {
            label: customer
              ? customerName(customer, t("anonymous"))
              : t("detailTitle"),
          },
        ]}
      />

      {customerQuery.isLoading && <ListLoadingSkeleton rows={5} />}
      {customerQuery.isError && (
        <ListErrorState
          error={customerQuery.error}
          onRetry={() => customerQuery.refetch()}
        />
      )}

      {customer && (
        <>
          <PageHeader
            title={customerName(customer, t("anonymous"))}
            description={customer.email ?? customer.phone_e164 ?? ""}
            action={
              <StatusBadge status={customer.is_active ? "active" : "archived"} />
            }
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <CustomerEditCard customer={customer} />
            <div className="flex flex-col gap-4">
              <CustomerAddressesCard customerId={customer.id} />
              <CustomerOrdersCard customerId={customer.id} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CustomerEditCard({ customer }: { customer: CustomerOut }) {
  const t = useTranslations("customers")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const canUpdate = usePermission(PERMISSIONS.customerUpdate)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: customer.first_name ?? "",
      last_name: customer.last_name ?? "",
      locale_pref: customer.locale_pref,
      accepts_marketing: customer.accepts_marketing,
      is_active: customer.is_active,
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      await customersApi.update(customer.id, {
        first_name: values.first_name || null,
        last_name: values.last_name || null,
        locale_pref: values.locale_pref,
        accepts_marketing: values.accepts_marketing,
        is_active: values.is_active,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      toast.success(t("updated"))
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
    <Card>
      <CardHeader>
        <CardTitle>{t("detailTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.firstName")}</FormLabel>
                    <FormControl>
                      <Input disabled={!canUpdate} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.lastName")}</FormLabel>
                    <FormControl>
                      <Input disabled={!canUpdate} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="locale_pref"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.localePref")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? field.value)}
                    disabled={!canUpdate}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locales.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l.toUpperCase()}
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
              name="accepts_marketing"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="cust-marketing">
                      {t("fields.acceptsMarketing")}
                    </Label>
                    <FormControl>
                      <Switch
                        id="cust-marketing"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canUpdate}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="cust-active">{t("fields.isActive")}</Label>
                    <FormControl>
                      <Switch
                        id="cust-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canUpdate}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            {canUpdate && (
              <div>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || !form.formState.isDirty}
                >
                  {form.formState.isSubmitting ? c("saving") : c("save")}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function CustomerAddressesCard({ customerId }: { customerId: number }) {
  const t = useTranslations("customers")

  const addressesQuery = useQuery({
    queryKey: queryKeys.customers.addresses(customerId),
    queryFn: ({ signal }) => customersApi.listAddresses(customerId, signal),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("addresses.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {addressesQuery.isLoading && <ListLoadingSkeleton rows={2} />}
        {addressesQuery.isError && (
          <ListErrorState
            error={addressesQuery.error}
            onRetry={() => addressesQuery.refetch()}
          />
        )}
        {addressesQuery.data && addressesQuery.data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("addresses.empty")}
          </p>
        )}
        {addressesQuery.data && addressesQuery.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {addressesQuery.data.map((address) => (
              <li
                key={address.id}
                className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{address.recipient_name}</span>
                  {address.is_default_shipping && (
                    <Badge variant="secondary">
                      {t("addresses.defaultShipping")}
                    </Badge>
                  )}
                  {address.is_default_billing && (
                    <Badge variant="outline">
                      {t("addresses.defaultBilling")}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.district ? `${address.district}, ` : ""}
                  {address.city} {address.postal_code ?? ""}
                  <br />
                  {address.phone_e164}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function CustomerOrdersCard({ customerId }: { customerId: number }) {
  const t = useTranslations("customers")
  const o = useTranslations("orders")
  const locale = useLocale()
  const format = useFormatter()
  const canViewOrders = usePermission(PERMISSIONS.orderView)

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.list({ customer_id: customerId }),
    queryFn: ({ signal }) =>
      ordersApi.list({ customer_id: customerId, limit: 10 }, signal),
    enabled: canViewOrders,
  })

  if (!canViewOrders) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("orders.title")}</CardTitle>
        <CardDescription>{o("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {ordersQuery.isLoading && <ListLoadingSkeleton rows={3} />}
        {ordersQuery.isError && (
          <ListErrorState
            error={ordersQuery.error}
            onRetry={() => ordersQuery.refetch()}
          />
        )}
        {ordersQuery.data && ordersQuery.data.items.length === 0 && (
          <ListEmptyState description={t("orders.empty")} />
        )}
        {ordersQuery.data && ordersQuery.data.items.length > 0 && (
          <ul className="flex flex-col gap-2">
            {ordersQuery.data.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/50"
                >
                  <code className="text-xs font-medium">
                    {order.order_number}
                  </code>
                  <StatusBadge status={order.status} />
                  <span className="font-medium">
                    {formatMoney(order.grand_total, locale, order.currency)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format.dateTime(new Date(order.placed_at), "short")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
