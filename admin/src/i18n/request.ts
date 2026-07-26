import { getRequestConfig } from "next-intl/server"

import { defaultLocale, isLocale } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = requested && isLocale(requested) ? requested : defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // All API traffic is ISO 8601 UTC; only the display layer is localised.
    timeZone: "Asia/Riyadh",
    formats: {
      dateTime: {
        short: { dateStyle: "medium" },
        long: { dateStyle: "medium", timeStyle: "short" },
      },
    },
  }
})
