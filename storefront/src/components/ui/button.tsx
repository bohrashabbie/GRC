import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xs font-medium " +
  "transition-colors duration-150 ease-out-soft disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-palm-600 text-sand-50 hover:bg-palm-700 active:bg-palm-800",
  secondary: "border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-sand-50",
  ghost: "text-ink-700 hover:text-ink-900 hover:bg-sand-100",
  // Gold is 2.9:1 on sand, so it is never a text colour here — it is a fill
  // carrying near-black text, which lands at 8.9:1.
  gold: "bg-gold-400 text-ink-900 hover:bg-gold-500",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export const buttonStyles = { base, variants, sizes };
