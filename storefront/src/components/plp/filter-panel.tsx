"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import { CloseIcon } from "@/components/ui/icons";
import { toggleFacetValue } from "@/lib/plp-query";
import type { Facet } from "@/types/shop";
import { cn } from "@/lib/utils";

/**
 * Facets write straight to the URL. The page is a Server Component, so a
 * `router.replace` re-runs the query on the server — there is no client-side
 * filtering of an already-fetched list anywhere in this app.
 */
export function FilterPanel({
  facets,
  activeCount,
  onDone,
}: {
  facets: Facet[];
  activeCount: number;
  onDone?: () => void;
}) {
  const t = useTranslations("plp");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  /**
   * The checked state is owned by the URL, and the URL only updates once the
   * server has re-rendered the listing. Without an optimistic layer the box
   * stays unticked for the whole round trip, which reads as a dead control.
   * `useOptimistic` shows the intent immediately and reconciles to the real
   * params when the navigation lands.
   */
  const [optimisticQuery, setOptimisticQuery] = useOptimistic(searchParams.toString());
  const current = new URLSearchParams(optimisticQuery);

  function apply(next: URLSearchParams) {
    startTransition(() => {
      setOptimisticQuery(next.toString());
      // `scroll: false` — re-filtering should not throw the shopper back to
      // the top of the page.
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  function onToggle(code: string, value: string) {
    apply(toggleFacetValue(current, code, value));
  }

  function onPriceChange(bound: "min_price" | "max_price", value: string) {
    const next = new URLSearchParams(current);
    if (value) next.set(bound, value);
    else next.delete(bound);
    apply(next);
  }

  function clearAll() {
    const next = new URLSearchParams(current);
    for (const key of ["colour", "size", "season", "min_price", "max_price"]) next.delete(key);
    apply(next);
  }

  const selected = (code: string) => (current.get(code) ?? "").split(",").filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-hairline pb-4">
        <h2 className="font-display text-h3 text-ink-900">{t("filters")}</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-gold-700 underline underline-offset-4"
          >
            {t("clearAll")}
          </button>
        )}
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            aria-label={t("hideFilters")}
            className="inline-flex size-9 items-center justify-center text-ink-700 lg:hidden"
          >
            <CloseIcon className="size-5" />
          </button>
        )}
      </div>

      <div className="flex-1 divide-y divide-hairline overflow-y-auto">
        {facets.map((facet) => (
          <fieldset key={facet.code} className="py-6">
            <legend className="eyebrow mb-4">{facet.label}</legend>

            {facet.type === "swatch" && (
              <ul className="flex flex-wrap gap-2.5">
                {facet.values.map((value) => {
                  const isOn = selected(facet.code).includes(value.value);
                  return (
                    <li key={value.value}>
                      <button
                        type="button"
                        onClick={() => onToggle(facet.code, value.value)}
                        aria-pressed={isOn}
                        title={`${value.label} (${value.count})`}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full ring-1 ring-inset transition-all",
                          isOn
                            ? "ring-2 ring-gold-500 ring-offset-2 ring-offset-sand-50"
                            : "ring-ink-900/15 hover:ring-ink-900/40",
                        )}
                        style={value.hex ? { backgroundColor: value.hex } : undefined}
                      >
                        <span className="sr-only">
                          {value.label} ({value.count})
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {facet.type === "checkbox" && (
              <ul className="space-y-2.5">
                {facet.values.map((value) => {
                  const isOn = selected(facet.code).includes(value.value);
                  return (
                    <li key={value.value}>
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => onToggle(facet.code, value.value)}
                          className="size-4 shrink-0 accent-palm-600"
                        />
                        <span className="flex-1">{value.label}</span>
                        <span className="tabular text-2xs text-ink-400">{value.count}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {facet.type === "range" && facet.range && (
              <div className="flex items-center gap-3">
                <label className="flex-1">
                  <span className="sr-only">{t("priceFrom")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    defaultValue={current.get("min_price") ?? ""}
                    placeholder={Number(facet.range.min).toFixed(0)}
                    onBlur={(event) => onPriceChange("min_price", event.currentTarget.value)}
                    className="tabular h-10 w-full rounded-xs border border-hairline-strong bg-surface px-3 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </label>
                <span className="text-ink-400">—</span>
                <label className="flex-1">
                  <span className="sr-only">{t("priceTo")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    defaultValue={current.get("max_price") ?? ""}
                    placeholder={Number(facet.range.max).toFixed(0)}
                    onBlur={(event) => onPriceChange("max_price", event.currentTarget.value)}
                    className="tabular h-10 w-full rounded-xs border border-hairline-strong bg-surface px-3 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </label>
              </div>
            )}
          </fieldset>
        ))}
      </div>
    </div>
  );
}

/** Mobile entry point — the same panel, in a bottom sheet. */
export function FilterDrawer({ facets, activeCount }: { facets: Facet[]; activeCount: number }) {
  const t = useTranslations("plp");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xs border border-ink-900 px-4 text-sm text-ink-900 lg:hidden"
      >
        {t("showFilters")}
        {activeCount > 0 && (
          <span className="tabular inline-flex size-5 items-center justify-center rounded-full bg-palm-600 text-2xs text-sand-50">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/45" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg bg-surface p-5 shadow-overlay">
            <FilterPanel
              facets={facets}
              activeCount={activeCount}
              onDone={() => setIsOpen(false)}
            />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mt-4 h-12 w-full rounded-xs bg-palm-600 text-sm font-medium text-sand-50"
            >
              {t("hideFilters")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
