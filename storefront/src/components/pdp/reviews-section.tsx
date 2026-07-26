"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { loadMoreReviews } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import type { Review, ReviewSummary } from "@/types/shop";

export function ReviewsList({
  slug,
  initialReviews,
  initialCursor,
  summary,
}: {
  slug: string;
  initialReviews: Review[];
  initialCursor: string | null;
  summary: ReviewSummary;
}) {
  const t = useTranslations("reviews");
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const [reviews, setReviews] = useState(initialReviews);
  const [cursor, setCursor] = useState(initialCursor);

  function onLoadMore() {
    if (!cursor) return;
    const next = cursor;
    startTransition(async () => {
      const page = await loadMoreReviews(slug, next, locale);
      setReviews((current) => [...current, ...page.items]);
      setCursor(page.next_cursor);
    });
  }

  if (summary.count === 0) {
    return <p className="text-sm text-ink-500">{t("empty")}</p>;
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
      <div className="lg:sticky lg:top-32 lg:self-start">
        <div className="flex items-baseline gap-3">
          <span className="tabular font-display text-display-2 text-ink-900">
            {summary.average}
          </span>
          <div>
            <StarRating value={summary.average} size="md" />
            <p className="mt-1 text-xs text-ink-500">{t("basedOn", { count: summary.count })}</p>
          </div>
        </div>

        <ul className="mt-6 space-y-1.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary.distribution[String(stars)] ?? 0;
            const percent = summary.count ? (count / summary.count) * 100 : 0;
            return (
              <li key={stars} className="flex items-center gap-3">
                <span className="tabular w-3 text-2xs text-ink-500">{stars}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-200">
                  <span
                    className="block h-full bg-gold-500"
                    style={{ inlineSize: `${percent}%` }}
                  />
                </span>
                <span className="tabular w-6 text-end text-2xs text-ink-400">{count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <ul className="divide-y divide-hairline border-t border-hairline">
          {reviews.map((review) => (
            <li key={review.id} className="py-6">
              <div className="flex flex-wrap items-center gap-3">
                <StarRating value={review.rating} />
                {review.is_verified_purchase && (
                  <span className="inline-flex items-center gap-1 bg-palm-600/10 px-2 py-0.5 text-2xs text-palm-700">
                    {t("verified")}
                  </span>
                )}
                <span className="text-2xs text-ink-400">
                  {formatDate(review.created_at, locale)}
                </span>
              </div>

              {review.title && (
                <h3 className="mt-3 text-sm font-semibold text-ink-900">{review.title}</h3>
              )}
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{review.body}</p>
              <p className="mt-2 text-2xs text-ink-400">{review.author_name}</p>
            </li>
          ))}
        </ul>

        {cursor && (
          <div className="mt-8">
            <Button variant="secondary" onClick={onLoadMore} disabled={isPending}>
              {t("loadMore")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
