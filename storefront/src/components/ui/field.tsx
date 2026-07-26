"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";

import { ChevronDownIcon } from "./icons";
import { cn } from "@/lib/utils";

const controlClass =
  "h-12 w-full rounded-xs border bg-surface px-3.5 text-sm text-ink-900 " +
  "placeholder:text-ink-400 focus:outline-none";

function FieldShell({
  label,
  hint,
  error,
  optional,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-2 text-xs text-ink-600">
        {label}
        {optional && <span className="text-2xs text-ink-400">({optional})</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-2xs text-brick-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-2xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  optional,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: string;
}) {
  const id = useId();

  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} htmlFor={id}>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          controlClass,
          error ? "border-brick-600" : "border-hairline-strong focus:border-gold-500",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={Boolean(error)}
          className={cn(
            controlClass,
            "appearance-none pe-10",
            error ? "border-brick-600" : "border-hairline-strong focus:border-gold-500",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
      </div>
    </FieldShell>
  );
}
