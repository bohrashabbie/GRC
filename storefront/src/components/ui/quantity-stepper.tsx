"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Minus/plus stepper. Laid out with logical properties so the minus always
 * sits at the inline-start edge; a hard-coded left/right would put the plus
 * before the minus in Arabic.
 */
export function QuantityStepper({
  value,
  max,
  min = 1,
  onChange,
  className,
}: {
  value: number;
  max?: number;
  min?: number;
  onChange: (next: number) => void;
  className?: string;
}) {
  const t = useTranslations("cart");

  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  const buttonClass =
    "inline-flex size-8 items-center justify-center text-ink-700 transition-colors " +
    "hover:text-ink-900 disabled:cursor-not-allowed disabled:text-sand-400";

  return (
    <div
      className={cn("inline-flex items-center border border-hairline-strong", className)}
      role="group"
      aria-label={t("quantity")}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label="−"
        className={buttonClass}
      >
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
          <path d="M3 8h10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>

      <span className="tabular min-w-8 text-center text-sm text-ink-900" aria-live="polite">
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label="+"
        className={buttonClass}
      >
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
