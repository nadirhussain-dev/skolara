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
        {icon ?? "📭"}
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-slate-400 dark:text-slate-500">{description}</p>
      )}
    </div>
  );
}
