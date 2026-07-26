import { getTranslations } from "next-intl/server";

import { FilterDrawer, FilterPanel } from "./filter-panel";
import { SortSelect } from "./sort-select";
import { ProductResults } from "./product-results";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { activeFilterCount } from "@/lib/plp-query";
import type { ListQuery } from "@/lib/shop-api";
import type { LocaleCode, ProductListResponse } from "@/types/shop";

/**
 * Shared shell for every listing surface — category pages, search results and
 * the wishlist all present the same grid, so the chrome around it lives once.
 */
export async function ListingView({
  title,
  intro,
  crumbs,
  data,
  query,
  locale,
  emptyMessage,
}: {
  title: string;
  intro?: string | null;
  crumbs: Crumb[];
  data: ProductListResponse;
  query: ListQuery;
  locale: LocaleCode;
  emptyMessage?: string;
}) {
  const t = await getTranslations("plp");
  const activeCount = activeFilterCount(query);
  const isEmpty = data.items.length === 0;

  return (
    <div className="container-site py-8 lg:py-12">
      <Breadcrumbs crumbs={crumbs} />

      <header className="mt-5 mb-8">
        <h1 className="font-display text-h1 text-ink-900">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-sm text-ink-500">{intro}</p>}
      </header>

      <div className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <FilterPanel facets={data.facets} activeCount={activeCount} />
        </aside>

        <div>
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-hairline pb-4">
            <p className="tabular text-sm text-ink-500">{t("results", { count: data.total_count })}</p>
            <div className="flex items-center gap-3">
              <FilterDrawer facets={data.facets} activeCount={activeCount} />
              <SortSelect />
            </div>
          </div>

          {isEmpty ? (
            <div className="py-20 text-center">
              <p className="font-display text-h3 text-ink-900">{emptyMessage ?? t("empty")}</p>
              <p className="mt-2 text-sm text-ink-500">{t("emptyAction")}</p>
            </div>
          ) : (
            <ProductResults
              initialItems={data.items}
              initialCursor={data.next_cursor}
              query={query}
              locale={locale}
            />
          )}
        </div>
      </div>
    </div>
  );
}
