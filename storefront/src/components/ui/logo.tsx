import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * The G monogram, cropped from the brand's source artwork. It's a solid
 * black shape on a transparent background, so `invert` (CSS filter) is how
 * it adapts to dark surfaces rather than a `currentColor` stroke.
 */
export function LogoMark({
  className,
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static PNG in
    // /public needs no optimisation pipeline.
    <img
      src="/favicon.png"
      alt=""
      aria-hidden="true"
      className={cn("inline-block object-contain", invert && "invert", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  const t = useTranslations("app");

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static PNG in
    // /public needs no optimisation pipeline.
    <img
      src="/logo-full.png"
      alt={t("name")}
      className={cn("h-8 w-auto object-contain", className)}
    />
  );
}
