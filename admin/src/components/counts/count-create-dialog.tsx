"use client"

import { useQuery } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VariantPicker } from "@/components/variant-picker"
import { countsApi, locationsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { bilingualName } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { VariantOut } from "@/lib/api/types"

export function CountCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (countId: number) => void
}) {
  const t = useTranslations("counts")
  const c = useTranslations("common")
  const locale = useLocale()

  const [locationId, setLocationId] = useState("")
  const [scope, setScope] = useState("partial")
  const [variants, setVariants] = useState<VariantOut[]>([])
  const [pending, setPending] = useState<VariantOut | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations.list({ is_active: true }),
    queryFn: ({ signal }) => locationsApi.list({ is_active: true }, signal),
    enabled: open,
  })

  const canSubmit = locationId !== "" && variants.length > 0

  function addVariant() {
    if (!pending) return
    setVariants((prev) =>
      prev.some((v) => v.id === pending.id) ? prev : [...prev, pending]
    )
    setPending(null)
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const count = await countsApi.create({
        location_id: Number(locationId),
        scope,
        variant_ids: variants.map((v) => v.id),
      })
      toast.success(t("created"))
      onOpenChange(false)
      onCreated(count.id)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("fields.location")}</Label>
              <Select
                value={locationId}
                onValueChange={(v) => setLocationId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(locationsQuery.data?.items ?? []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {bilingualName(l, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("fields.scope")}</Label>
              <Select value={scope} onValueChange={(v) => setScope(v ?? "partial")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partial">{t("scopePartial")}</SelectItem>
                  <SelectItem value="full">{t("scopeFull")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <h4 className="text-sm font-medium">{t("fields.variants")}</h4>

            {variants.length > 0 && (
              <ul className="flex flex-col gap-2">
                {variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
                  >
                    <code className="flex-1 text-xs">{variant.sku}</code>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={c("remove")}
                      onClick={() =>
                        setVariants((prev) =>
                          prev.filter((v) => v.id !== variant.id)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <VariantPicker value={pending?.id ?? null} onChange={setPending} />
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={!pending}
                onClick={addVariant}
              >
                {c("add")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {c("cancel")}
          </Button>
          <Button disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? c("creating") : c("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
