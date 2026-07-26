"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { ReturnIcon, ShieldIcon } from "@/components/ui/icons";
import type { StoreLocation } from "@/types/shop";
import { cn } from "@/lib/utils";

/**
 * Store locator.
 *
 * No embedded map: a maps SDK is a third-party script on a page that is
 * otherwise fully static, and the strict thing a shopper actually needs is
 * "which branch is near me and does it take returns". Each card deep-links to
 * the device's own maps app instead.
 */
export function StoreList({ stores }: { stores: StoreLocation[] }) {
  const t = useTranslations("stores");
  const [city, setCity] = useState<string>("all");

  const cities = useMemo(
    () => [...new Set(stores.map((store) => store.city))],
    [stores],
  );

  const visible = useMemo(
    () => (city === "all" ? stores : stores.filter((store) => store.city === city)),
    [stores, city],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCity("all")}
          aria-pressed={city === "all"}
          className={cn(
            "h-9 rounded-full border px-4 text-sm transition-colors",
            city === "all"
              ? "border-ink-900 bg-ink-900 text-sand-50"
              : "border-hairline-strong text-ink-700 hover:border-ink-900",
          )}
        >
          {t("allCities")}
        </button>

        {cities.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setCity(name)}
            aria-pressed={city === name}
            className={cn(
              "h-9 rounded-full border px-4 text-sm transition-colors",
              city === name
                ? "border-ink-900 bg-ink-900 text-sand-50"
                : "border-hairline-strong text-ink-700 hover:border-ink-900",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((store) => (
            <li key={store.id} className="flex flex-col border border-hairline bg-surface p-5">
              <p className="eyebrow">{store.city}</p>
              <h2 className="mt-2 font-display text-h3 text-ink-900">{store.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{store.address_line}</p>

              <p className="mt-4 flex items-center gap-2 text-2xs">
                {store.accepts_returns ? (
                  <>
                    <ReturnIcon className="size-4 text-palm-600" />
                    <span className="text-palm-700">{t("acceptsReturns")}</span>
                  </>
                ) : (
                  <>
                    <ShieldIcon className="size-4 text-ink-400" />
                    <span className="text-ink-400">{t("noReturns")}</span>
                  </>
                )}
              </p>

              <p className="mt-3 text-2xs text-ink-400">
                {t("openingHours")}: {t("hoursValue")}
              </p>

              <div className="mt-auto flex flex-wrap gap-4 pt-5">
                {store.latitude !== null && store.longitude !== null && (
                  <a
                    href={`https://maps.google.com/?q=${store.latitude},${store.longitude}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-gold-700 underline underline-offset-4"
                  >
                    {t("directions")}
                  </a>
                )}
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    dir="ltr"
                    className="tabular text-xs text-ink-600 underline underline-offset-4"
                  >
                    {store.phone}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
