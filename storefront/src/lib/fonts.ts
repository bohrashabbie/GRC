import { Cormorant_Garamond, IBM_Plex_Sans_Arabic, Reem_Kufi } from "next/font/google";

/**
 * Three faces, each doing one job.
 *
 * - `plexArabic` is the body voice for both scripts. It is one of the few
 *   families with a genuinely well-drawn Arabic and a matching Latin, so an
 *   AR/EN page keeps a single texture instead of visibly switching families
 *   mid-paragraph on a brand name or a size code.
 * - `reemKufi` carries Arabic headlines. Geometric Kufi reads as heritage
 *   without tipping into pastiche, which is the register a traditional-wear
 *   retailer wants.
 * - `cormorant` carries Latin headlines. High-contrast old-style serif is the
 *   established apparel-editorial voice, and it holds its own next to Kufi
 *   because the two never appear on the same page — `--font-display` is
 *   rebound by locale in globals.css.
 *
 * All three are subset to only the scripts that locale can render, so the
 * Arabic build never ships Cormorant's Latin-only outlines and vice versa.
 */

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const reemKufi = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-reem-kufi",
  display: "swap",
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const fontVariables = [plexArabic.variable, reemKufi.variable, cormorant.variable].join(" ");
