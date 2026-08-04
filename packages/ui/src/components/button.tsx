import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

const variants = {
  primary: "bg-brand-700 text-white hover:bg-brand-900",
  secondary:
    "bg-white text-brand-700 border border-brand-300 hover:bg-brand-50",
  accent: "bg-accent-500 text-white hover:bg-accent-700",
  ghost: "text-brand-700 hover:bg-brand-50",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
