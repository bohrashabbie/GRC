import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * The mark is a Rub el Hizb — two squares at 45° to each other — drawn as a
 * hairline rather than a solid. It is the one piece of ornament in the whole
 * identity, and it reads at 20px as well as it does at 200.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("size-6", className)}
    >
      <rect x="5" y="5" width="14" height="14" />
      <path d="M12 2.1 21.9 12 12 21.9 2.1 12 12 2.1Z" />
      <circle cx="12" cy="12" r="1.6" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  const t = useTranslations("app");

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7 shrink-0 text-gold-500" />
      {/* "GR8" has no Arabic form, so the wordmark is pinned to the Latin
          display face rather than following `--font-display`, which swaps to
          Reem Kufi under Arabic and would render the wordmark in a face never
          drawn for it. */}
      <span className="font-[family-name:var(--font-cormorant)] text-[1.5rem] leading-none tracking-[0.08em] text-ink-900">
        {t("name")}
      </span>
    </span>
  );
}
