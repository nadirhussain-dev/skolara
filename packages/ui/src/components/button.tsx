import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

const variants = {
  primary:
    "bg-brand-gradient text-white shadow-glow hover:brightness-110 active:brightness-95",
  secondary:
    "bg-white text-brand-700 border border-brand-200 shadow-sm hover:border-brand-300 hover:bg-brand-50 dark:bg-slate-900 dark:text-brand-300 dark:border-slate-700 dark:hover:bg-slate-800",
  accent:
    "bg-coral-gradient text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,0.45)] hover:brightness-110 active:brightness-95",
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
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:brightness-100",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
