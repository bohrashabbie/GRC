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
import { categoriesApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedName } from "@/lib/format"
import { CATEGORY_DIMENSIONS, humanizeStatus } from "@/lib/status"
import {
  fromNameTranslationForm,
  toNameTranslationForm,
} from "@/lib/translations-form"
import { queryKeys } from "@/lib/query/keys"
import type { CategoryOut } from "@/lib/api/types"

const NO_PARENT = "__root__"

function useCategorySchema() {
  const c = useTranslations("catalog")
  return z
    .object({
      code: z.string().min(1, c("validation.codeRequired")),
      dimension: z.string().min(1),
      parent_id: z.string(),
      sort_order: z.coerce.number().int(),
      show_in_menu: z.boolean(),
      is_active: z.boolean(),
      translations: z.object({
        ar: z.object({ name: z.string(), slug: z.string() }),
        en: z.object({ name: z.string(), slug: z.string() }),
      }),
    })
    .refine(
      (v) => v.translations.ar.name.trim() || v.translations.en.name.trim(),
      { message: c("validation.nameRequired"), path: ["translations.en.name"] }
    )
}

type FormValues = z.infer<ReturnType<typeof useCategorySchema>>
const FIELD_NAMES = ["code", "dimension", "parent_id", "sort_order"] as const

export function CategoryFormDialog({
  category,
  defaultDimension,
  open,
  onOpenChange,
}: {
  category?: CategoryOut
  defaultDimension?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("categories")
  const c = useTranslations("common")
  const cat = useTranslations("catalog")
  const locale = useLocale()
  const schema = useCategorySchema()
  const queryClient = useQueryClient()
  const isEdit = !!category

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: category?.code ?? "",
      dimension: category?.dimension ?? defaultDimension ?? CATEGORY_DIMENSIONS[0],
      parent_id: category?.parent_id ? String(category.parent_id) : NO_PARENT,
      sort_order: category?.sort_order ?? 0,
      show_in_menu: category?.show_in_menu ?? true,
      is_active: category?.is_active ?? true,
      translations: toNameTranslationForm(category?.translations),
    },
  })

  const dimension = form.watch("dimension")

  // Parent options come from the same dimension — the trees are separate.
  const parentsQuery = useQuery({
    queryKey: queryKeys.categories.list({ dimension, is_active: null }),
    queryFn: ({ signal }) =>
      categoriesApi.list({ dimension, limit: 100 }, signal),
    enabled: open,
  })

  const parentCandidates = (parentsQuery.data?.items ?? []).filter(
    // A category can't be its own parent.
    (candidate) => candidate.id !== category?.id
  )

  async function onSubmit(values: FormValues) {
    const translations = fromNameTranslationForm(values.translations)
    const parentId =
      values.parent_id === NO_PARENT ? null : Number(values.parent_id)
    try {
      if (isEdit) {
        await categoriesApi.update(category.id, {
          code: values.code,
          dimension: values.dimension,
          parent_id: parentId,
          sort_order: values.sort_order,
          show_in_menu: values.show_in_menu,
          is_active: values.is_active,
          translations,
        })
      } else {
        await categoriesApi.create({
          code: values.code,
          dimension: values.dimension,
          parent_id: parentId,
          sort_order: values.sort_order,
          show_in_menu: values.show_in_menu,
          is_active: values.is_active,
          translations,
        })
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
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
            <TranslationNameFields control={form.control} showSlug />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dimension"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.dimension")}</FormLabel>
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
                        {CATEGORY_DIMENSIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {humanizeStatus(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("hints.dimension")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.parent")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? NO_PARENT)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PARENT}>
                          {t("fields.noParent")}
                        </SelectItem>
                        {parentCandidates.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {"— ".repeat(p.depth)}
                            {translatedName(p.translations, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <FormLabel>{cat("fields.code")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" disabled={isEdit} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{cat("fields.sortOrder")}</FormLabel>
                    <FormControl>
                      <Input type="number" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="show_in_menu"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="cat-menu">{t("fields.showInMenu")}</Label>
                    <FormControl>
                      <Switch
                        id="cat-menu"
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
                    <Label htmlFor="cat-active">{cat("fields.isActive")}</Label>
                    <FormControl>
                      <Switch
                        id="cat-active"
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
