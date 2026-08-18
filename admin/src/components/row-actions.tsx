"use client"

import { Pencil, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

/** The Edit/Delete pair every listing row ends with.
 *
 * One component so the buttons are the same size, the same order and the same
 * distance apart on every page: staff learn one shape and stop hunting for the
 * right button. Icons rather than words keep the cluster narrow enough to sit
 * in its own column, aligned down the list, instead of drifting with the
 * length of each row's name.
 *
 * `extra` takes any action that is neither edit nor delete (Deactivate,
 * Continue, …) and renders it before the icons, where a worded button belongs.
 */
export function RowActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  extra,
}: {
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
  deleteLabel?: string
  extra?: React.ReactNode
}) {
  const c = useTranslations("common")
  const edit = editLabel ?? c("edit")
  const remove = deleteLabel ?? c("delete")

  return (
    <div className="flex items-center gap-1.5">
      {extra}
      {onEdit && (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={edit}
          title={edit}
          onClick={(event) => {
            // Listing rows are often clickable themselves.
            event.stopPropagation()
            onEdit()
          }}
        >
          <Pencil />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="destructive"
          size="icon-sm"
          aria-label={remove}
          title={remove}
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  )
}
