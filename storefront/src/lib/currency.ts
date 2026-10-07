/**
 * Showing KWD prices in the visitor's currency. Display only: every order and
 * payment stays in KWD, and checkout charges the KD amount.
 *
 * Conversion is exact: the KWD string and the rate string are multiplied as
 * scaled integers (BigInt), then rounded half-up once to the target's decimals.
 * No float touches a price or a rate — the same reason `format.ts` never does
 * arithmetic on money.
 */

/** As the API sends it: units of `code` per 1 KWD, as a decimal string. */
export interface CurrencyRate {
  code: string;
  rate: string;
}

export interface SelectedCurrency extends CurrencyRate {
  /** ISO 4217 minor-unit digits (SAR 2, KWD 3, JPY 0), from the CLDR data Intl carries. */
  decimals: number;
}

export interface CurrencyOption extends SelectedCurrency {
  /** In the visitor's language. */
  name: string;
  /** File name under /flags (ISO region, lower case), or null when none fits. */
  flag: string | null;
}

export const CURRENCY_COOKIE_NAME = "gr8_currency";

export const KWD: SelectedCurrency = { code: "KWD", rate: "1", decimals: 3 };

export function currencyDecimals(code: string): number {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** Currencies whose ISO code does not start with a country code. */
const FLAG_EXCEPTIONS: Record<string, string | null> = {
  EUR: "eu",
  ANG: "cw",
  XCD: null,
  XAF: null,
  XOF: null,
  XPF: null,
};

export function flagFor(code: string, regions: Intl.DisplayNames): string | null {
  if (code in FLAG_EXCEPTIONS) return FLAG_EXCEPTIONS[code] ?? null;
  if (code.startsWith("X")) return null; // supranational units
  const region = code.slice(0, 2);
  // Intl echoes an unknown region code back unchanged; a known one has a name.
  const name = regions.of(region);
  return name && name !== region ? region.toLowerCase() : null;
}

function toScaled(value: string): { digits: bigint; scale: number } | null {
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(value.trim());
  if (!match || (match[2] === "" && !match[3])) return null;
  const fraction = match[3] ?? "";
  const digits = BigInt(`${match[1]}${match[2] || "0"}${fraction}`);
  return { digits, scale: fraction.length };
}

/**
 * `amountKwd × rate`, rounded half-up (away from zero) to `decimals`, as a
 * decimal string. Returns null when either input is not a decimal string.
 */
export function convertAmount(amountKwd: string, rate: string, decimals: number): string | null {
  const amount = toScaled(amountKwd);
  const factor = toScaled(rate);
  if (!amount || !factor) return null;

  let product = amount.digits * factor.digits;
  const scale = amount.scale + factor.scale;
  const negative = product < BigInt(0);
  if (negative) product = -product;

  let rounded: bigint;
  if (scale > decimals) {
    const divisor = BigInt(10) ** BigInt(scale - decimals);
    rounded = product / divisor;
    if ((product % divisor) * BigInt(2) >= divisor) rounded += BigInt(1);
  } else {
    rounded = product * BigInt(10) ** BigInt(decimals - scale);
  }

  const text = rounded.toString().padStart(decimals + 1, "0");
  const whole = decimals ? text.slice(0, -decimals) : text;
  const fraction = decimals ? `.${text.slice(-decimals)}` : "";
  return `${negative && rounded !== BigInt(0) ? "-" : ""}${whole}${fraction}`;
}
