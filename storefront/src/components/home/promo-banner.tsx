import { Link } from "@/i18n/navigation";
import { ChevronForwardIcon } from "@/components/ui/icons";
import type { Banner } from "@/types/shop";

export function PromoBanner({ banner }: { banner: Banner }) {
  return (
    <Link
      href={banner.cta_href ?? "/"}
      className="group relative isolate block overflow-hidden bg-ink-900"
    >
      <div className="aspect-[3/2] sm:aspect-[21/8]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={banner.desktop_image.url}
          alt={banner.desktop_image.alt ?? ""}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/40 to-transparent rtl:bg-gradient-to-l" />

      <div className="absolute inset-0 flex items-center">
        <div className="container-site max-w-xl">
          <h2 className="font-display text-display-2 text-sand-50">{banner.title}</h2>
          <p className="mt-2 text-sm text-sand-200 sm:text-base">{banner.subtitle}</p>
          <span className="mt-5 inline-flex items-center gap-2 border-b border-gold-400 pb-1 text-sm font-medium text-gold-300">
            {banner.cta_label}
            <ChevronForwardIcon className="size-4 flip-rtl transition-[translate] group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
