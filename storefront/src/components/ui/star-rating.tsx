import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Five stars with a fractional fill.
 *
 * The fill is a width-clipped overlay rather than per-star half-icons, so 4.3
 * renders honestly instead of rounding to 4.5. `dir="ltr"` is pinned on the
 * track: stars fill left-to-right by convention in both locales, and letting
 * the row mirror in Arabic would make a 4.3 look like a 0.7.
 */
export function StarRating({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useTranslations("reviews");
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  const starSize = size === "md" ? "size-5" : "size-3.5";

  const Star = ({ filled }: { filled: boolean }) => (
    <svg
      viewBox="0 0 20 20"
      className={cn(starSize, filled ? "text-gold-500" : "text-sand-300")}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
    </svg>
  );

  return (
    <span
      dir="ltr"
      className={cn("relative inline-flex", className)}
      role="img"
      aria-label={t("starsLabel", { rating: value })}
    >
      <span className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} filled={false} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex gap-0.5 overflow-hidden"
        style={{ width: `${percent}%` }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} filled />
        ))}
      </span>
    </span>
  );
}
