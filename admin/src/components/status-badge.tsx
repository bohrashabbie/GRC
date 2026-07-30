import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { humanizeStatus, statusTone, type BadgeTone } from "@/lib/status"

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-status-success/10 text-status-success-foreground",
  warning: "bg-status-warning/10 text-status-warning-foreground",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-status-info/10 text-status-info-foreground",
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
