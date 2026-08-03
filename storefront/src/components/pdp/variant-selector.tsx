"use client";

import { useTranslations } from "next-intl";

import type { ProductOption, ProductVariant } from "@/types/shop";
import { cn } from "@/lib/utils";

export type Selection = Record<string, string | undefined>;

/**
 * Finds the variant matching every current selection. Returns null until all
 * options are chosen, or when the chosen combination has no variant at all.
 */
export function findVariant(
  variants: ProductVariant[],
  options: ProductOption[],
  selection: Selection,
): ProductVariant | null {
  if (options.some((option) => !selection[option.id])) return null;

  return (
    variants.find((variant) =>
      options.every((option) => variant.option_values[option.id] === selection[option.id]),
    ) ?? null
  );
}

/**
 * Whether picking `valueId` for `optionId` would land on a variant that
 * actually exists, holding every *other* current selection fixed.
 *
 * This is the guard the brief calls out: variants are built explicitly rather
 * than as a cartesian product, so combinations genuinely do not exist and the
 * UI must refuse them rather than silently falling through to a default.
 */
function existsWith(
  variants: ProductVariant[],
  selection: Selection,
  optionId: string,
  valueId: string,
): ProductVariant[] {
  return variants.filter((variant) => {
    if (variant.option_values[optionId] !== valueId) return false;

    return Object.entries(selection).every(([otherId, otherValue]) => {
      if (otherId === optionId || !otherValue) return true;
      return variant.option_values[otherId] === otherValue;
    });
  });
}

export function VariantSelector({
  options,
  variants,
  selection,
  onSelect,
}: {
  options: ProductOption[];
  variants: ProductVariant[];
  selection: Selection;
  onSelect: (optionId: string, valueId: string) => void;
}) {
  const t = useTranslations("pdp");

  return (
    <div className="space-y-6">
      {options.map((option) => {
        const selectedValue = option.values.find((value) => value.id === selection[option.id]);
        const measurements = [
          selectedValue?.length_cm != null &&
            t("sizeLength", { value: selectedValue.length_cm }),
          selectedValue?.width_cm != null &&
            t("sizeWidth", { value: selectedValue.width_cm }),
        ].filter(Boolean);

        return (
          <fieldset key={option.id}>
            <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
              <span className="eyebrow">{option.name}</span>
              {/* The echoed value is decoration — `aria-pressed` on the buttons
                  already conveys the selection. Left in the accessible name it
                  makes the legend read "Size52" before every single option. */}
              {selectedValue && (
                <span aria-hidden="true" className="text-xs text-ink-500">
                  {selectedValue.name}
                </span>
              )}
            </legend>

            <ul className="flex flex-wrap gap-2.5">
              {option.values.map((value) => {
                const candidates = existsWith(variants, selection, option.id, value.id);
                const exists = candidates.length > 0;
                const allSoldOut =
                  exists && candidates.every((v) => v.stock_state === "out_of_stock");
                const isSelected = selection[option.id] === value.id;

                // A sold-out option stays clickable on purpose. Disabling it
                // would make it indistinguishable from a combination that was
                // never built, and the shopper would get no explanation —
                // selecting it surfaces the out-of-stock panel instead.
                const suffix = !exists
                  ? ` — ${t("unavailableCombination")}`
                  : allSoldOut
                    ? ` — ${t("outOfStockOption")}`
                    : "";
                const label = `${value.name}${suffix}`;

                if (option.input_type === "swatch") {
                  return (
                    <li key={value.id}>
                      <button
                        type="button"
                        onClick={() => exists && onSelect(option.id, value.id)}
                        disabled={!exists}
                        aria-pressed={isSelected}
                        title={label}
                        className={cn(
                          "relative flex size-10 items-center justify-center rounded-full ring-1 ring-inset transition-all",
                          isSelected
                            ? "ring-2 ring-gold-500 ring-offset-2 ring-offset-sand-50"
                            : "ring-ink-900/15 hover:ring-ink-900/40",
                          !exists && "cursor-not-allowed opacity-35",
                        )}
                        style={value.hex ? { backgroundColor: value.hex } : undefined}
                      >
                        <span className="sr-only">{label}</span>
                        {(allSoldOut || !exists) && (
                          <svg viewBox="0 0 40 40" className="absolute inset-0 size-full">
                            <line
                              x1="6"
                              y1="34"
                              x2="34"
                              y2="6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              className="text-ink-900/45"
                            />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={value.id}>
                    <button
                      type="button"
                      onClick={() => exists && onSelect(option.id, value.id)}
                      disabled={!exists}
                      aria-pressed={isSelected}
                      title={label}
                      className={cn(
                        "tabular relative min-w-14 border px-4 py-2.5 text-sm transition-colors",
                        isSelected
                          ? "border-ink-900 bg-ink-900 text-sand-50"
                          : "border-hairline-strong text-ink-800 hover:border-ink-900",
                        !exists &&
                          "cursor-not-allowed border-hairline text-sand-400 line-through hover:border-hairline",
                        allSoldOut && !isSelected && "text-ink-400 line-through",
                      )}
                    >
                      {value.name}
                      <span className="sr-only">{suffix}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* The garment measurements the chosen size stands for. Lives
                under the buttons rather than inside them so the row of sizes
                stays scannable. */}
            {measurements.length > 0 && (
              <p className="mt-2.5 text-xs text-ink-500">
                {measurements.join(" · ")}
              </p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
