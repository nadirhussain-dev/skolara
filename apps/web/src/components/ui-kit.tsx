"use client";

import { useTranslation } from "@skolara/i18n";
import { Button, Skeleton, cn } from "@skolara/ui";
import { useEffect, useId, useRef, type ReactNode } from "react";

/** Page heading with an optional action on the trailing side. */
export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * A labelled form field. The label is always visible (a placeholder
 * disappears as soon as someone types) and any error is tied to the input
 * for screen readers.
 */
export function Field({
  label,
  help,
  error,
  optional,
  children,
  className,
}: {
  label: string;
  help?: string;
  error?: string | null;
  optional?: boolean;
  /** Receives the ids to put on the input. */
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-slate-900 dark:text-slate-50">
        {label}
        {optional && <span className="font-medium text-slate-600 dark:text-slate-400"> ({t("common.optional")})</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
      ) : help ? (
        <p id={`${id}-help`} className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{help}</p>
      ) : null}
    </div>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A panel that slides in from the trailing edge for add and edit forms, so
 * the list underneath stays in view. Focus moves in, stays in, and returns
 * to whatever opened it.
 */
export function SidePanel({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = panel.current;
    node?.querySelector<HTMLElement>("input,select,textarea")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-slate-950/50" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 id={titleId} className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{title}</h2>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

/** Loading, failed and loaded-but-empty states for a list, in one place. */
export function ListState({
  isError,
  isLoading,
  onRetry,
  errorText,
  rows = 5,
}: {
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  errorText: string;
  rows?: number;
}) {
  const { t } = useTranslation();
  if (isError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{errorText}</p>
        <Button variant="secondary" onClick={onRetry}>{t("common.retry")}</Button>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-5" aria-busy>
        {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}
      </div>
    );
  }
  return null;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const letters = name.split(/\s+/).map((word) => word[0] ?? "").join("").slice(0, 2).toUpperCase();
  return (
    <span aria-hidden className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-800 dark:bg-brand-900/50 dark:text-brand-100", className)}>
      {letters}
    </span>
  );
}

/** A random 12-character temporary password from the browser's secure generator. */
export function generatePassword(): string {
  // No look-alikes (0/O, 1/l/I) since someone will read this out or copy it by hand.
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** A row of pill tabs that filter the list below, with an optional count on each. */
export function FilterTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700",
            value === option.value
              ? "bg-brand-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs tabular-nums",
                value === option.value ? "bg-white/20" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
