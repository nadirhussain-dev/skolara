import type { SVGProps } from "react";
import { cn } from "../cn";

export interface SkolaraMarkProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  /** Rendered width and height in px. */
  size?: number;
  /**
   * `solid` is the indigo tile with a white stroke; `reversed` is a white tile
   * for dark or coloured backgrounds; `mono` is the bare stroke in
   * `currentColor`, for stamps and print.
   */
  variant?: "solid" | "reversed" | "mono";
}

/**
 * The Skolara mark: a single-stroke S with an amber spark. Always Skolara's
 * own colours — it is never tinted with a school's theme.
 */
export function SkolaraMark({
  size = 32,
  variant = "solid",
  className,
  ...props
}: SkolaraMarkProps) {
  const tile = variant === "solid" ? "#3730A3" : variant === "reversed" ? "#FFFFFF" : null;
  const stroke =
    variant === "solid" ? "#FFFFFF" : variant === "reversed" ? "#3730A3" : "currentColor";
  const spark = variant === "mono" ? "currentColor" : "#F59E0B";
  // Below ~28px the stroke needs more weight to stay legible.
  const small = size < 28;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Skolara"
      className={cn("shrink-0", className)}
      {...props}
    >
      {tile && <rect width="64" height="64" rx={small ? 14 : 16} fill={tile} />}
      <path
        d="M38 18H28a7 7 0 0 0 0 14h8a7 7 0 0 1 0 14H22"
        fill="none"
        stroke={stroke}
        strokeWidth={small ? 8 : 7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="47" cy="18" r={small ? 5 : 4.5} fill={spark} />
    </svg>
  );
}

export interface SkolaraLogoProps {
  size?: number;
  /** `onDark` flips the mark and wordmark for dark or coloured backgrounds. */
  onDark?: boolean;
  className?: string;
}

/** Mark plus lowercase wordmark. */
export function SkolaraLogo({ size = 32, onDark = false, className }: SkolaraLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SkolaraMark size={size} variant={onDark ? "reversed" : "solid"} aria-hidden />
      <span
        className={cn("font-extrabold leading-none", onDark ? "text-white" : "text-[#1E1B4B]")}
        style={{ fontSize: Math.round(size * 0.66), letterSpacing: "-0.045em" }}
      >
        skolara
      </span>
    </span>
  );
}
