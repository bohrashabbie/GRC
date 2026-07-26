import type { ReactNode } from "react";

/**
 * Next requires a root layout, but `<html>` and `<body>` live in
 * `[locale]/layout.tsx` — they need the resolved locale to set `lang` and
 * `dir`, which is not available this far up the tree.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
