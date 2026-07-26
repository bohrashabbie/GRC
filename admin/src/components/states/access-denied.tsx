import { ShieldAlert } from "lucide-react"
import { useTranslations } from "next-intl"

export function AccessDenied({ permission }: { permission: string }) {
  const t = useTranslations("states")

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-6" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold text-foreground">
        {t("accessDeniedTitle")}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("accessDeniedDescription", { permission })}
      </p>
    </div>
  )
}
