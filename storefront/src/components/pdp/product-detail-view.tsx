"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { ProductGallery } from "./product-gallery";
import { VariantSelector, findVariant, type Selection } from "./variant-selector";
import { ProductAccordion } from "./product-accordion";
import { useCart } from "@/components/cart/cart-provider";
import { Price } from "@/components/product/price";
import { WishlistButton } from "@/components/product/wishlist-button";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { StarRating } from "@/components/ui/star-rating";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ProductDetail } from "@/types/shop";

/**
 * Owns the option selection, because both the gallery (which filters by
 * colour) and the buy panel depend on it.
 */
export function ProductDetailView({ product }: { product: ProductDetail }) {
  const t = useTranslations("pdp");
  const tProduct = useTranslations("product");
  const locale = useLocale() as Locale;
  const { addItem } = useCart();
  const [isPending, startTransition] = useTransition();

  // Default to the first combination that actually exists and is in stock,
  // falling back to the first that merely exists.
  const initialSelection = useMemo<Selection>(() => {
    const inStock = product.variants.find((v) => v.stock_state !== "out_of_stock");
    const seed = inStock ?? product.variants[0];
    if (!seed) return {};

    return Object.fromEntries(
      product.options.map((option) => [option.id, seed.option_values[option.id]]),
    );
  }, [product.variants, product.options]);

  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [quantity, setQuantity] = useState(1);

  const variant = findVariant(product.variants, product.options, selection);
  const selectedColourId = selection.colour ?? null;

  const isSoldOut = variant?.stock_state === "out_of_stock";
  const canAdd = variant !== null && !isSoldOut;

  function onSelect(optionId: string, valueId: string) {
    setSelection((current) => {
      const next = { ...current, [optionId]: valueId };

      // Changing one axis can strand the others on a combination that no
      // longer exists. Drop any selection that is now impossible rather than
      // leaving the panel in a state with no matching variant.
      for (const option of product.options) {
        if (option.id === optionId) continue;
        const chosen = next[option.id];
        if (!chosen) continue;

        const stillValid = product.variants.some(
          (v) =>
            v.option_values[optionId] === valueId && v.option_values[option.id] === chosen,
        );
        if (!stillValid) next[option.id] = undefined;
      }

      return next;
    });
    setQuantity(1);
  }

  function onAdd() {
    if (!variant) return;
    startTransition(async () => {
      await addItem(variant.id, product.slug, quantity);
    });
  }

  const price = variant?.price ?? product.price_range.min;
  const compareAt = variant?.compare_at_price ?? null;

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <ProductGallery
        media={product.media}
        selectedColourId={selectedColourId}
        productName={product.name}
      />

      <div className="lg:sticky lg:top-32 lg:self-start">
        {product.brand && <p className="eyebrow">{product.brand.name}</p>}

        <h1 className="mt-2 font-display text-h1 text-ink-900">{product.name}</h1>

        {product.rating && (
          <a href="#reviews" className="mt-3 inline-flex items-center gap-2">
            <StarRating value={product.rating.average} />
            <span className="tabular text-xs text-ink-500">
              {product.rating.average} ({product.rating.count})
            </span>
          </a>
        )}

        <div className="mt-5 flex items-baseline gap-3">
          <Price price={price} compareAtPrice={compareAt} size="lg" />
          <span className="text-2xs text-ink-400">{t("vatIncluded")}</span>
        </div>

        <div className="mt-8">
          <VariantSelector
            options={product.options}
            variants={product.variants}
            selection={selection}
            onSelect={onSelect}
          />
        </div>

        <div className="mt-6">
          <Link
            // CMS page slugs are per-locale, so the Arabic page lives at its
            // Arabic slug — a fixed English slug would 404 on /ar.
            href={locale === "ar" ? "/pages/دليل-المقاسات" : "/pages/size-guide"}
            className="text-xs text-gold-700 underline underline-offset-4"
          >
            {t("sizeGuide")}
          </Link>
        </div>

        {variant?.stock_state === "low_stock" && variant.available_quantity !== null && (
          <p className="mt-5 text-sm text-brick-600">
            {tProduct("onlyLeft", { count: variant.available_quantity })}
          </p>
        )}

        {isSoldOut && (
          <div className="mt-6 border-s-2 border-brick-600 bg-sand-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">{t("outOfStockTitle")}</p>
            <p className="mt-1 text-sm text-ink-500">{t("outOfStockBody")}</p>
          </div>
        )}

        {!variant && !isSoldOut && (
          <p className="mt-6 text-sm text-brick-600">{t("unavailableCombination")}</p>
        )}

        <div className="mt-8 flex items-center gap-3">
          <QuantityStepper
            value={quantity}
            max={variant?.available_quantity ?? undefined}
            onChange={setQuantity}
            className="h-13"
          />
          <Button size="lg" className="flex-1" onClick={onAdd} disabled={!canAdd || isPending}>
            {isPending ? t("adding") : t("addToCart")}
          </Button>
          <WishlistButton productId={product.id} className="size-13 border border-hairline-strong" />
        </div>

        <ProductAccordion product={product} locale={locale} />
      </div>
    </div>
  );
}
