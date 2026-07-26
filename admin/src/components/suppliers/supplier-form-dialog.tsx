"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { suppliersApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type { SupplierOut } from "@/lib/api/types"

const OPTIONAL_INT = z
  .string()
  .regex(/^\d*$/)
  .optional()

function useSupplierSchema() {
  const cat = useTranslations("catalog")
  const v = useTranslations("validation")
  return z.object({
    code: z.string().min(1, cat("validation.codeRequired")),
    name: z.string().min(1),
    contact_name: z.string().optional(),
    email: z.string().email(v("emailInvalid")).or(z.literal("")).optional(),
    phone_e164: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, v("phoneE164"))
      .or(z.literal(""))
      .optional(),
    address: z.string().optional(),
    vat_number: z.string().optional(),
    payment_terms_days: OPTIONAL_INT,
    default_lead_time_days: OPTIONAL_INT,
    is_active: z.boolean(),
  })
}

type FormValues = z.infer<ReturnType<typeof useSupplierSchema>>
const FIELD_NAMES = [
  "code",
  "name",
  "contact_name",
  "email",
  "phone_e164",
  "address",
  "vat_number",
  "payment_terms_days",
  "default_lead_time_days",
] as const

export function SupplierFormDialog({
  supplier,
  open,
  onOpenChange,
}: {
  supplier?: SupplierOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("suppliers")
  const c = useTranslations("common")
  const schema = useSupplierSchema()
  const queryClient = useQueryClient()
  const isEdit = !!supplier

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: supplier?.code ?? "",
      name: supplier?.name ?? "",
      contact_name: supplier?.contact_name ?? "",
      email: supplier?.email ?? "",
      phone_e164: supplier?.phone_e164 ?? "",
      address: supplier?.address ?? "",
      vat_number: supplier?.vat_number ?? "",
      payment_terms_days:
        supplier?.payment_terms_days === null ||
        supplier?.payment_terms_days === undefined
          ? ""
          : String(supplier.payment_terms_days),
      default_lead_time_days:
        supplier?.default_lead_time_days === null ||
        supplier?.default_lead_time_days === undefined
          ? ""
          : String(supplier.default_lead_time_days),
      is_active: supplier?.is_active ?? true,
    },
  })

  async function onSubmit(values: FormValues) {
    // Empty optional text/number fields are sent as null, never "" or 0.
    const payload = {
      name: values.name,
      contact_name: values.contact_name || null,
      email: values.email || null,
      phone_e164: values.phone_e164 || null,
      address: values.address || null,
      vat_number: values.vat_number || null,
      payment_terms_days: values.payment_terms_days
        ? Number(values.payment_terms_days)
        : null,
      default_lead_time_days: values.default_lead_time_days
        ? Number(values.default_lead_time_days)
        : null,
      is_active: values.is_active,
    }

    try {
      if (isEdit) {
        await suppliersApi.update(supplier.id, payload)
      } else {
        await suppliersApi.create({ ...payload, code: values.code })
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      toast.success(isEdit ? t("updated") : t("created"))
      onOpenChange(false)
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
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.code")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" disabled={isEdit} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.contactName")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone_e164"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.phone")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" placeholder="+9665XXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vat_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.vatNumber")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.address")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="payment_terms_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.paymentTerms")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_lead_time_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.leadTime")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="sup-active">{t("fields.isActive")}</Label>
                    <FormControl>
                      <Switch
                        id="sup-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {c("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? c("saving")
                  : isEdit
                    ? c("save")
                    : c("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
