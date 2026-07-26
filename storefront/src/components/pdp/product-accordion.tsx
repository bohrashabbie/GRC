"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ChevronDownIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import type { ProductDetail } from "@/types/shop";
import { cn } from "@/lib/utils";

/**
 * Description, specifications and shipping. An accordion rather than tabs:
 * on a phone tabs push content below the fold and hide two thirds of it, and
 * the same component then has to behave differently at each breakpoint.
 */
export function ProductAccordion({ product, locale }: { product: ProductDetail; locale: Locale }) {
  const t = useTranslations("pdp");
  const [open, setOpen] = useState<string | null>("description");

  const sections = [
    {
      id: "description",
      title: t("description"),
      content: (
        <div
          className="prose-storefront"
          // Server-authored catalogue copy, not user input.
          dangerouslySetInnerHTML={{ __html: product.description_html }}
        />
      ),
    },
    {
      id: "specifications",
      title: t("specifications"),
      content: (
        <dl className="divide-y divide-hairline">
          {product.attributes.map((attribute) => (
            <div key={attribute.code} className="flex gap-4 py-2.5 text-sm">
              <dt className="w-32 shrink-0 text-ink-500">{attribute.name}</dt>
              <dd className="text-ink-800">{attribute.value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      id: "shipping",
      title: t("shippingReturns"),
      content: <p className="text-sm leading-relaxed text-ink-600">{t("shippingBody")}</p>,
    },
  ];

  void locale;

  return (
    <div className="mt-10 divide-y divide-hairline border-y border-hairline">
      {sections.map((section) => {
        const isOpen = open === section.id;
        return (
          <div key={section.id}>
            <h2>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : section.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-4 text-start text-sm font-medium text-ink-900"
              >
                {section.title}
                <ChevronDownIcon
                  className={cn(
                    "size-4 shrink-0 text-ink-400 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </h2>
            {isOpen && <div className="pb-5">{section.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
