import { cn } from "../cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-brand-700",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
