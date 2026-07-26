import { Link } from "@/i18n/navigation";
import { ChevronForwardIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  href,
  hrefLabel,
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: string | null;
  href?: string | null;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-2 font-display text-h1 text-ink-900">{title}</h2>
        {intro && <p className="mt-2 max-w-xl text-sm text-ink-500">{intro}</p>}
      </div>

      {href && hrefLabel && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 border-b border-hairline-strong pb-1 text-sm text-ink-700 transition-colors hover:border-gold-500 hover:text-ink-900"
        >
          {hrefLabel}
          <ChevronForwardIcon className="size-4 flip-rtl text-gold-500 transition-[translate] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
