import type { HTMLAttributes } from "react";
import { cn } from "../cn";

/**
 * A placeholder block shown while content loads, sized by the caller to
 * match what will replace it so the page doesn't jump.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-lg bg-slate-200/80 motion-reduce:animate-none dark:bg-slate-800",
        className,
      )}
      {...props}
    />
  );
}
