"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { loadMoreProducts } from "@/app/actions";
import { ProductGrid } from "@/components/product/product-rail";
import { Button } from "@/components/ui/button";
import { queryKey, type RawSearchParams } from "@/lib/plp-query";
import type { ListQuery } from "@/lib/shop-api";
import type { LocaleCode, ProductCard } from "@/types/shop";

/**
 * Holds the accumulated pages from "load more".
 *
 * The first page is rendered on the server and handed in as `initialItems`, so
 * the listing is in the HTML for crawlers and for the first paint. Subsequent
 * pages come from a Server Action. When the filters change the server sends a
 * new first page and a new `queryId`, which resets everything accumulated —
 * without that, page 2 of the old filter set would linger under page 1 of the
 * new one.
 */
export function ProductResults({
  initialItems,
  initialCursor,
  query,
  locale,
}: {
  initialItems: ProductCard[];
  initialCursor: string | null;
  query: ListQuery;
  locale: LocaleCode;
}) {
  const t = useTranslations("plp");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const queryId = queryKey(query);
  const [state, setState] = useState({ queryId, items: initialItems, cursor: initialCursor });

  useEffect(() => {
    setState({ queryId, items: initialItems, cursor: initialCursor });
  }, [queryId, initialItems, initialCursor]);

  function onLoadMore() {
    if (!state.cursor) return;
    const cursor = state.cursor;

    startTransition(async () => {
      const page = await loadMoreProducts(query, cursor, locale);
      setState((current) =>
        // Guard against a filter change landing mid-request: if the identity
        // moved on, this response is for a query nobody is looking at.
        current.queryId !== queryId
          ? current
          : { queryId, items: [...current.items, ...page.items], cursor: page.next_cursor },
      );
    });
  }

  return (
    <>
      <ProductGrid products={state.items} />

      <div className="mt-14 flex justify-center">
        {state.cursor ? (
          <Button variant="secondary" size="lg" onClick={onLoadMore} disabled={isPending}>
            {isPending ? tCommon("loading") : t("loadMore")}
          </Button>
        ) : (
          state.items.length > 0 && <p className="text-sm text-ink-400">{t("allLoaded")}</p>
        )}
      </div>
    </>
  );
}

export type { RawSearchParams };
