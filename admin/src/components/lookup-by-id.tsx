"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Several resources (transfers, stock counts, purchase orders) have no list
 * endpoint in the API — only POST and GET /{id}. Rather than fake a list or
 * hide the feature, those pages let you open a record by its ID and say why.
 */
export function LookupById({
  label,
  placeholder,
  hint,
  onOpen,
}: {
  label: string
  placeholder: string
  hint: string
  onOpen: (id: number) => void
}) {
  const t = useTranslations("common")
  const [value, setValue] = useState("")
  const parsed = Number(value)
  const isValid = value.trim() !== "" && Number.isInteger(parsed) && parsed > 0

  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <AlertDescription>{hint}</AlertDescription>
      </Alert>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (isValid) onOpen(parsed)
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lookup-id">{label}</Label>
          <Input
            id="lookup-id"
            dir="ltr"
            inputMode="numeric"
            className="w-48"
            placeholder={placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={!isValid}>
          {t("view")}
        </Button>
      </form>
    </div>
  )
}
