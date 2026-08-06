import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../cn";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-600 dark:focus:ring-brand-900/40",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
