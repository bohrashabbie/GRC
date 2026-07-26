"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { usePermission } from "@/hooks/use-permission"
import { usersApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { UserOut } from "@/lib/api/types"

function useEditUserSchema() {
  const v = useTranslations("validation")
  return z.object({
    full_name: z.string().min(1, v("fullNameRequired")),
    phone_e164: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, v("phoneE164"))
      .or(z.literal(""))
      .optional(),
    is_active: z.boolean(),
  })
}

type FormValues = z.infer<ReturnType<typeof useEditUserSchema>>
const FIELD_NAMES = ["full_name", "phone_e164", "is_active"] as const

export function EditUserForm({ user }: { user: UserOut }) {
  const t = useTranslations("users")
  const c = useTranslations("common")
  const schema = useEditUserSchema()
  const queryClient = useQueryClient()
  const canUpdate = usePermission(PERMISSIONS.userUpdate)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user.full_name,
      phone_e164: user.phone_e164 ?? "",
      is_active: user.is_active,
    },
  })

  // Keep the form in sync if the underlying query refetches (e.g. after a
  // role change triggers a background revalidation of this same user).
  useEffect(() => {
    form.reset({
      full_name: user.full_name,
      phone_e164: user.phone_e164 ?? "",
      is_active: user.is_active,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.full_name, user.phone_e164, user.is_active])

  async function onSubmit(values: FormValues) {
    try {
      await usersApi.update(user.id, {
        full_name: values.full_name,
        phone_e164: values.phone_e164 ? values.phone_e164 : null,
        is_active: values.is_active,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
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
        <CardTitle>{t("editTitle")}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            {/* Email is read-only and not a form field, so this uses plain
                Label/<p> rather than FormLabel/FormDescription, which both
                require a surrounding <FormField> context. */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-email-readonly">{t("fields.email")}</Label>
              <Input
                id="user-email-readonly"
                value={user.email}
                disabled
                readOnly
              />
              <p className="text-xs text-muted-foreground">
                {t("hints.emailImmutable")}
              </p>
            </div>

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.fullName")}</FormLabel>
                  <FormControl>
                    <Input disabled={!canUpdate} autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_e164"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fields.phone")}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({c("optional")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+9665XXXXXXXX"
                      disabled={!canUpdate}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="is_active-switch">{t("fields.isActive")}</Label>
                      <span className="text-xs text-muted-foreground">
                        {t("hints.isActive")}
                      </span>
                    </div>
                    <FormControl>
                      <Switch
                        id="is_active-switch"
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
