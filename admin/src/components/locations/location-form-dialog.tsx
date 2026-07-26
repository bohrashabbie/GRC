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
import { locationsApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { LOCATION_TYPE_VALUES, humanizeStatus } from "@/lib/status"
import { queryKeys } from "@/lib/query/keys"
import type { LocationOut } from "@/lib/api/types"

function useLocationSchema() {
  const cat = useTranslations("catalog")
  return z.object({
    code: z.string().min(1, cat("validation.codeRequired")),
    type: z.string().min(1),
    name_ar: z.string().min(1),
    name_en: z.string().min(1),
    is_sellable_online: z.boolean(),
    fulfilment_priority: z.coerce.number().int(),
    is_active: z.boolean(),
  })
}

type FormValues = z.infer<ReturnType<typeof useLocationSchema>>
const FIELD_NAMES = [
  "code",
  "type",
  "name_ar",
  "name_en",
  "fulfilment_priority",
] as const

export function LocationFormDialog({
  location,
  open,
  onOpenChange,
}: {
  location?: LocationOut
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("locations")
  const c = useTranslations("common")
  const schema = useLocationSchema()
  const queryClient = useQueryClient()
  const isEdit = !!location

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: location?.code ?? "",
      type: location?.type ?? LOCATION_TYPE_VALUES[0],
      name_ar: location?.name_ar ?? "",
      name_en: location?.name_en ?? "",
      is_sellable_online: location?.is_sellable_online ?? true,
      fulfilment_priority: location?.fulfilment_priority ?? 0,
      is_active: location?.is_active ?? true,
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        // Code and type are immutable after creation in the API.
        await locationsApi.update(location.id, {
          name_ar: values.name_ar,
          name_en: values.name_en,
          is_sellable_online: values.is_sellable_online,
          fulfilment_priority: values.fulfilment_priority,
          is_active: values.is_active,
        })
      } else {
        await locationsApi.create(values)
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
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
      <DialogContent>
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
                name="name_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.nameEn")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.nameAr")}</FormLabel>
                    <FormControl>
                      <Input dir="rtl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.type")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? field.value)}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCATION_TYPE_VALUES.map((lt) => (
                          <SelectItem key={lt} value={lt}>
                            {humanizeStatus(lt)}
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
              name="fulfilment_priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.fulfilmentPriority")}</FormLabel>
                  <FormControl>
                    <Input type="number" dir="ltr" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("hints.fulfilmentPriority")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_sellable_online"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="loc-sellable">
                        {t("fields.isSellableOnline")}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {t("hints.sellableOnline")}
                      </span>
                    </div>
                    <FormControl>
                      <Switch
                        id="loc-sellable"
                        checked={field.value}
                        onCheckedChange={field.onChange}
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
                    <Label htmlFor="loc-active">{t("fields.isActive")}</Label>
                    <FormControl>
                      <Switch
                        id="loc-active"
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
