import { AlertTriangle, Inbox } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api/error-message"

export function ListLoadingSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function ListEmptyState({
  title,
  description,
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  const t = useTranslations("states")

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <Inbox className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">
        {title ?? t("emptyTitle")}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {description ?? t("emptyDescription")}
      </p>
      {action}
    </div>
  )
}

export function ListErrorState({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  const t = useTranslations("states")
  const c = useTranslations("common")

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <p className="text-sm font-medium text-foreground">{t("errorTitle")}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {getErrorMessage(error, c("unknownError"))}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {c("retry")}
        </Button>
      )}
    </div>
  )
}
