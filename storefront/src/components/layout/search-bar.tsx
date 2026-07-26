"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

function useSearchSubmit(onDone?: () => void) {
  const router = useRouter();
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    if (typeof query !== "string" || !query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    onDone?.();
  };
}

/** Inline search field — desktop header only. */
export function SearchBar({ className }: { className?: string }) {
  const t = useTranslations("header");
  const onSubmit = useSearchSubmit();

  return (
    <form role="search" onSubmit={onSubmit} className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
      <input
        name="q"
        type="search"
        placeholder={t("searchPlaceholder")}
        aria-label={t("search")}
        className={cn(
          "h-11 w-full rounded-xs border border-hairline-strong bg-surface ps-10 pe-4 text-sm",
          "placeholder:text-ink-400 focus:border-gold-500 focus:outline-none",
        )}
      />
    </form>
  );
}

/** Full-width drawer — mobile and tablet, where the inline field has no room. */
export function SearchDrawer() {
  const t = useTranslations("header");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onSubmit = useSearchSubmit(() => setIsOpen(false));

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("search")}
        aria-expanded={isOpen}
        className="inline-flex size-10 items-center justify-center text-ink-800 md:hidden"
      >
        <SearchIcon className="size-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink-900/45" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-x-0 top-0 bg-surface p-4 shadow-overlay">
            <form role="search" onSubmit={onSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  ref={inputRef}
                  name="q"
                  type="search"
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("search")}
                  className="h-11 w-full rounded-xs border border-hairline-strong bg-surface ps-10 pe-3 text-sm placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t("closeMenu")}
                className="inline-flex size-10 items-center justify-center text-ink-700"
              >
                <CloseIcon className="size-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
