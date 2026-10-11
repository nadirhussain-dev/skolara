import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl dark:bg-slate-800">
        {icon ?? (
          <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-700 dark:text-brand-300">
            <path d="M3 13l3-8h12l3 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z" />
            <path d="M3 13h5l1 2h6l1-2h5" />
          </svg>
        )}
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">{description}</p>
      )}
    </div>
  );
}
