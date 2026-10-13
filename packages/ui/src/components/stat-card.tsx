import type { ReactNode } from "react";
import { cn } from "../cn";
import { Card } from "./card";

const hintTones = {
  neutral: "text-slate-600 dark:text-slate-400",
  brand: "text-brand-700 dark:text-brand-300",
  success: "text-emerald-700 dark:text-emerald-400",
  warning: "text-warning-800 dark:text-warning-300",
  danger: "text-red-700 dark:text-red-400",
} as const;

export interface StatCardProps {
  label: string;
  value: string | number;
  /** The line under the number — what it means or what to do about it. */
  hint?: string;
  /** Colours the hint only. The number itself always stays neutral. */
  tone?: keyof typeof hintTones;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, hint, tone = "neutral", icon, className }: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
        {value}
      </p>
      {hint && <p className={cn("mt-1 text-sm font-bold", hintTones[tone])}>{hint}</p>}
    </Card>
  );
}
