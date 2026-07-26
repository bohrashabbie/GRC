"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { mediaApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { mediaUrl } from "@/lib/format"

/**
 * Single-image field: upload a file, keep its media id, show a preview.
 *
 * Deliberately not shared with product-media-tab — that one attaches media to
 * a product with a colour and a primary flag, which is a different job. This
 * is the plain "one image on a record" case used by categories and banners.
 */
export function MediaPicker({
  value,
  storageKey,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  /** Current media id, or null when unset. */
  value: number | null
  /** Storage key for the current value, when already known, so the preview
   *  renders without a second fetch. */
  storageKey?: string | null
  onChange: (mediaId: number | null, storageKey: string | null) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  const t = useTranslations("media")
  const c = useTranslations("common")
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(storageKey ?? null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const media = await mediaApi.upload(file)
      setPreview(media.storage_key)
      onChange(media.id, media.storage_key)
      toast.success(t("uploaded"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function clear() {
    setPreview(null)
    onChange(null, null)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>

      {preview ? (
        <div className="flex items-start gap-3">
          {/* The API serves uploads from its own origin, outside Next's image
              optimiser, so this stays a plain img. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(preview)}
            alt=""
            className="h-24 w-24 rounded-md border object-cover"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={disabled || uploading}
          >
            {t("remove")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noImage")}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? t("uploading") : value ? t("replace") : t("upload")}
        </Button>
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
