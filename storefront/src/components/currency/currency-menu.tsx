"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ChevronDownIcon } from "@/components/ui/icons";
import { CURRENCY_COOKIE_NAME } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useCurrency } from "./currency-provider";

/** A flag, or a quiet placeholder for currencies that belong to no one country. */
function Flag({ code }: { code: string | null }) {
  if (!code) return <span className="inline-block h-[15px] w-5 rounded-sm bg-sand-300/40" aria-hidden="true" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 271 tiny static SVGs; next/image adds nothing here
    <img
      src={`/flags/${code}.svg`}
      alt=""
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      className="h-[15px] w-5 rounded-sm object-cover"
    />
  );
}

/**
 * "🇰🇼 KWD ▾" in the top bar. Opens a searchable list of every currency, each
 * with its flag and its name in the visitor's language. Choosing one stores it
 * in a cookie and re-renders the page on the server, so every price redraws in
 * that currency at once. Display only: checkout always charges in KWD.
 */
export function CurrencyMenu({ className }: { className?: string }) {
  const t = useTranslations("currency");
  const { selected, options } = useCurrency();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const current = options.find((option) => option.code === selected.code) ?? options[0];

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && root.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) => option.code.toLowerCase().includes(q) || option.name.toLowerCase().includes(q),
    );
  }, [options, query]);

  const choose = (code: string) => {
    document.cookie = `${CURRENCY_COOKIE_NAME}=${code}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    setQuery("");
    router.refresh();
  };

  // Rates unavailable: KWD is the only choice, so there is nothing to offer.
  if (!current || options.length < 2) return null;

  return (
    <div className={cn("relative", className)} ref={root}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${t("menu")}: ${current.name}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-gold-300"
      >
        <Flag code={current.flag} />
        <span dir="ltr">{current.code}</span>
        <ChevronDownIcon className="size-3.5" />
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] border border-hairline bg-surface text-ink-900 shadow-overlay">
          <label className="sr-only" htmlFor="currency-search">
            {t("search")}
          </label>
          <input
            ref={search}
            id="currency-search"
            type="search"
            placeholder={t("search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            className="w-full border-b border-hairline bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-ink-400"
          />
          <ul className="max-h-72 overflow-y-auto py-1" aria-label={t("menu")}>
            {shown.map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  aria-current={option.code === current.code ? "true" : undefined}
                  onClick={() => choose(option.code)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm transition-colors hover:bg-sand-100",
                    option.code === current.code && "bg-sand-100 font-semibold",
                  )}
                >
                  <Flag code={option.flag} />
                  <span className="flex-1 truncate">{option.name}</span>
                  <span className="text-xs text-ink-400" dir="ltr">
                    {option.code}
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-ink-400">{t("none")}</li>}
          </ul>
          <p className="border-t border-hairline px-3 py-2 text-2xs leading-relaxed text-ink-400">
            {t("note")}
          </p>
        </div>
      )}
    </div>
  );
}
