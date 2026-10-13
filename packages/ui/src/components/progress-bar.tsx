import { cn } from "../cn";

const fills = {
  brand: "bg-brand-600",
  accent: "bg-accent-500",
  success: "bg-emerald-600",
  danger: "bg-red-700",
  muted: "bg-slate-300 dark:bg-slate-600",
} as const;

export interface ProgressSegment {
  /** Share of the bar, 0–100. Segments are drawn in order. */
  value: number;
  tone?: keyof typeof fills;
}

export interface ProgressBarProps {
  /** A single 0–100 value, or several segments that share the bar. */
  value?: number;
  segments?: ProgressSegment[];
  tone?: keyof typeof fills;
  /** Read out by screen readers; the bar is otherwise purely visual. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

function clamp(value: number) {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function ProgressBar({
  value,
  segments,
  tone = "brand",
  label,
  size = "md",
  className,
}: ProgressBarProps) {
  const parts = segments ?? [{ value: value ?? 0, tone }];
  const total = clamp(parts.reduce((sum, part) => sum + clamp(part.value), 0));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(total)}
      className={cn(
        "flex w-full gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
        size === "sm" ? "h-2" : "h-3",
        className,
      )}
    >
      {parts.map((part, index) => (
        <div
          key={index}
          className={cn("h-full rounded-full", fills[part.tone ?? tone])}
          style={{ width: `${clamp(part.value)}%` }}
        />
      ))}
    </div>
  );
}
