import { Cormorant_Garamond, IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from "next/font/google";

/**
 * Three faces, each doing one job.
 *
 * - `plexArabic` is the body voice for both scripts. It is one of the few
 *   families with a genuinely well-drawn Arabic and a matching Latin, so an
 *   AR/EN page keeps a single texture instead of visibly switching families
 *   mid-paragraph on a brand name or a size code.
 * - `naskh` carries Arabic headlines. A restrained, classical Naskh is the
 *   Arabic counterpart of an editorial serif: refined and calm, where a
 *   geometric Kufi read as decorative next to the clean body text.
 * - `cormorant` carries Latin headlines. High-contrast old-style serif is the
 *   established apparel-editorial voice, and Naskh is its Arabic equivalent
 *   in register. The two never share a page — `--font-display` is rebound by
 *   locale in globals.css.
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

export const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  variable: "--font-naskh",
  display: "swap",
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const fontVariables = [plexArabic.variable, naskh.variable, cormorant.variable].join(" ");
