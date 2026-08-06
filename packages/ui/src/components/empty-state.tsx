import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-10 text-center">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {description && (
        <p className="text-sm text-slate-400 dark:text-slate-500">{description}</p>
      )}
    </div>
  );
}
