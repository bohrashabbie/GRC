"use client";

import { useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { CloseIcon } from "@/components/ui/icons";

/**
 * "Size guide" on the product page: opens the measuring diagram in a modal.
 * A native <dialog> gives focus trapping, Escape-to-close and the backdrop
 * for free; a click on the backdrop itself closes it too.
 */
export function SizeChartDialog() {
  const t = useTranslations("pdp");
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="text-xs text-gold-700 underline underline-offset-4"
      >
        {t("sizeGuide")}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="size-chart-title"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto max-h-[92dvh] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto bg-sand-50 p-0 text-ink-900 shadow-overlay backdrop:bg-ink-900/60"
      >
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
          <h2 id="size-chart-title" className="font-display text-xl">
            {t("sizeGuide")}
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={t("sizeGuideClose")}
            className="inline-flex size-9 items-center justify-center text-ink-500 transition-colors hover:text-ink-900"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          <Image
            src="/size-chart.jpg"
            alt={t("sizeGuideAlt")}
            width={1122}
            height={1402}
            sizes="(max-width: 640px) 100vw, 34rem"
            className="mx-auto h-auto w-full max-w-sm"
          />

          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="font-semibold">{t("sizeGuideChest")}</dt>
              <dd className="mt-0.5 text-ink-500">{t("sizeGuideChestHow")}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t("sizeGuideLength")}</dt>
              <dd className="mt-0.5 text-ink-500">{t("sizeGuideLengthHow")}</dd>
            </div>
          </dl>
        </div>
      </dialog>
    </>
  );
}
