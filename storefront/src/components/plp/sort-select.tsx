"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import { SORT_OPTIONS } from "@/lib/plp-query";

const LABEL_KEYS: Record<string, string> = {
  relevance: "sortRelevance",
  newest: "sortNewest",
  price_asc: "sortPriceAsc",
  price_desc: "sortPriceDesc",
  rating: "sortRating",
};

export function SortSelect() {
  const t = useTranslations("plp");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Same reasoning as the facet checkboxes: the select is URL-controlled, so
  // without this it snaps back to the old value until the server responds.
  const [optimisticSort, setOptimisticSort] = useOptimistic(
    searchParams.get("sort") ?? "relevance",
  );

  function onChange(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "relevance") next.delete("sort");
    else next.set("sort", value);

    startTransition(() => {
      setOptimisticSort(value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("sort")}</span>
      <select
        value={optimisticSort}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="h-10 appearance-none rounded-xs border border-hairline-strong bg-surface ps-4 pe-10 text-sm text-ink-800 focus:border-gold-500 focus:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(LABEL_KEYS[option])}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute end-3 size-4 text-ink-400" />
    </label>
  );
}
