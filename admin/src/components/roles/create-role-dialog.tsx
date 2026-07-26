"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useState } from "react"
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
  DialogTrigger,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { ListErrorState, ListLoadingSkeleton } from "@/components/states/list-states"
import { PermissionCheckboxGrid } from "./permission-checkbox-grid"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { rolesApi } from "@/lib/api/endpoints"
import { queryKeys } from "@/lib/query/keys"
import type { RoleCreate } from "@/lib/api/types"

const CODE_PATTERN = /^[a-z][a-z0-9_]*$/

function useCreateRoleSchema() {
  const v = useTranslations("validation")
  const r = useTranslations("roles")
  return z.object({
    code: z
      .string()
      .min(2, r("codeMin"))
      .max(64)
      .regex(CODE_PATTERN, r("codePattern")),
    name_ar: z.string().min(1, v("fullNameRequired")),
    name_en: z.string().min(1, v("fullNameRequired")),
    description: z.string().optional(),
  })
}

type FormValues = z.infer<ReturnType<typeof useCreateRoleSchema>>
const FIELD_NAMES = ["code", "name_ar", "name_en", "description"] as const

export function CreateRoleDialog() {
  const t = useTranslations("roles")
  const c = useTranslations("common")
  const schema = useCreateRoleSchema()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const permissionsQuery = useQuery({
    queryKey: queryKeys.roles.permissions(),
    queryFn: ({ signal }) => rolesApi.permissions(signal),
    enabled: open,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name_ar: "", name_en: "", description: "" },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      form.reset()
      setSelected(new Set())
    }
  }

  async function onSubmit(values: FormValues) {
    const payload: RoleCreate = {
      code: values.code,
      name_ar: values.name_ar,
      name_en: values.name_en,
      description: values.description ? values.description : null,
      permission_keys: [...selected],
    }
    try {
      await rolesApi.create(payload)
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      toast.success(t("created"))
      handleOpenChange(false)
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button>{t("newRole")}</Button>} />
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

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.code")}</FormLabel>
                  <FormControl>
                    <Input placeholder="warehouse_lead" autoComplete="off" {...field} />
                  </FormControl>
                  <FormDescription>{t("hints.code")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fields.description")}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({c("optional")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              {/* Plain Label, not FormLabel: the permission set is local state,
                  not a react-hook-form field, so there's no FormField context. */}
              <Label>{t("matrixTitle")}</Label>
              <ScrollArea className="h-64 rounded-lg border border-border">
                <div className="p-1">
                  {permissionsQuery.isLoading && <ListLoadingSkeleton rows={4} />}
                  {permissionsQuery.isError && (
                    <ListErrorState
                      error={permissionsQuery.error}
                      onRetry={() => permissionsQuery.refetch()}
                    />
                  )}
                  {permissionsQuery.data && (
                    <PermissionCheckboxGrid
                      permissions={permissionsQuery.data}
                      selected={selected}
                      onChange={setSelected}
                    />
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
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
