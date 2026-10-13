import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

const variants = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900",
  secondary:
    "bg-white text-brand-700 border border-brand-200 shadow-sm hover:border-brand-300 hover:bg-brand-50 dark:bg-slate-900 dark:text-brand-300 dark:border-slate-700 dark:hover:bg-slate-800",
  // Dark text: white on amber fails contrast.
  accent: "bg-accent-500 text-[#1E1B4B] hover:bg-accent-400 active:bg-accent-600",
  ghost: "text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-slate-800",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center min-h-[2.75rem] rounded-lg px-4 py-2.5 text-sm font-bold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
