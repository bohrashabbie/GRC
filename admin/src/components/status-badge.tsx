import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { humanizeStatus, statusTone, type BadgeTone } from "@/lib/status"

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success:
    "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  warning:
    "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
}

/** Consistent colour-coding for every status string the API returns. */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string
  /** Overrides the humanised fallback when a translation exists. */
  label?: string
  className?: string
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(TONE_CLASSES[statusTone(status)], className)}
    >
      {label ?? humanizeStatus(status)}
    </Badge>
  )
}
