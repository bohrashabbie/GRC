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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { locationsApi, rolesApi, usersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"

const ALL_LOCATIONS = "__all__"

const schema = z.object({
  role_id: z.string().min(1),
  location_id: z.string(),
})
type FormValues = z.infer<typeof schema>

export function AssignRoleDialog({ userId }: { userId: number }) {
  const t = useTranslations("users")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: ({ signal }) => rolesApi.list(signal),
    enabled: open,
  })
  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list(),
    queryFn: ({ signal }) => locationsApi.list({ is_active: true }, signal),
    enabled: open,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role_id: "", location_id: ALL_LOCATIONS },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) form.reset()
  }

  async function onSubmit(values: FormValues) {
    try {
      await usersApi.assignRole(userId, {
        role_id: Number(values.role_id),
        location_id:
          values.location_id === ALL_LOCATIONS ? null : Number(values.location_id),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.roles(userId) })
      toast.success(t("roles.assigned"))
      handleOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  const locations = locationsQuery.data?.items ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm">{t("roles.assign")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("roles.assignTitle")}</DialogTitle>
          <DialogDescription>{t("roles.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("roles.role")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("roles.selectRole")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(rolesQuery.data ?? []).map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          {role.name_en} · {role.name_ar}
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
              name="location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("roles.location")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ALL_LOCATIONS}>
                        {t("roles.locationAll")}
                      </SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={String(location.id)}>
                          {location.name_en} · {location.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("roles.locationHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {c("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !form.watch("role_id")}
              >
                {form.formState.isSubmitting ? c("saving") : t("roles.assign")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
