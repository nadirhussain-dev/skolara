/**
 * School theming.
 *
 * A school picks one primary colour. Everything else — the tints behind
 * selected rows, the hover shade, the dark sidebar — is derived from it, so a
 * school can't end up with a palette that doesn't hang together. Status
 * colours (paid, absent, pending) are deliberately not part of the theme:
 * they must mean the same thing in every school.
 */

export const DEFAULT_BRAND_COLOR = "#3730A3";

/** WCAG AA for normal text. White button labels sit on the primary colour. */
const MIN_CONTRAST_ON_WHITE = 4.5;

export type Rgb = readonly [number, number, number];

export const BRAND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type BrandStep = (typeof BRAND_STEPS)[number];
export type BrandScale = Record<BrandStep, Rgb>;

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_PATTERN.test(value);
}

export function hexToRgb(hex: string): Rgb {
  if (!isHexColor(hex)) throw new Error(`expected a hex colour like #3730A3, got "${hex}"`);
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function mix(a: Rgb, b: Rgb, amountOfB: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amountOfB),
    Math.round(a[1] + (b[1] - a[1]) * amountOfB),
    Math.round(a[2] + (b[2] - a[2]) * amountOfB),
  ];
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours, from 1 (identical) to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

export function isReadableUnderWhiteText(hex: string): boolean {
  return contrastRatio(hexToRgb(hex), WHITE) >= MIN_CONTRAST_ON_WHITE;
}

/**
 * The colour to actually theme with. A colour too light to carry white text
 * is darkened, keeping its hue, until it can — refusing it outright would
 * leave a school with a bright yellow crest no way to look like itself.
 * Anything that isn't a hex colour falls back to the Skolara default.
 */
export function safeBrandColor(input: string | null | undefined): string {
  if (!isHexColor(input)) return DEFAULT_BRAND_COLOR;
  let rgb = hexToRgb(input);
  for (let i = 0; i < 40 && contrastRatio(rgb, WHITE) < MIN_CONTRAST_ON_WHITE; i++) {
    rgb = mix(rgb, BLACK, 0.05);
  }
  return rgbToHex(rgb);
}

/**
 * Tint and shade ramp around the school's colour, which sits at 700 — the
 * step buttons, links and the active nav item use.
 */
export function brandScale(input: string | null | undefined): BrandScale {
  const base = hexToRgb(safeBrandColor(input));
  return {
    50: mix(base, WHITE, 0.93),
    100: mix(base, WHITE, 0.86),
    200: mix(base, WHITE, 0.72),
    300: mix(base, WHITE, 0.55),
    400: mix(base, WHITE, 0.36),
    500: mix(base, WHITE, 0.2),
    600: mix(base, WHITE, 0.08),
    700: base,
    800: mix(base, BLACK, 0.18),
    900: mix(base, BLACK, 0.4),
  };
}

/**
 * CSS custom properties for a scale, as space-separated RGB channels so
 * Tailwind's opacity modifiers (`bg-brand-700/40`) keep working.
 */
export function brandCssVariables(input: string | null | undefined): Record<string, string> {
  const scale = brandScale(input);
  const variables: Record<string, string> = {};
  for (const step of BRAND_STEPS) {
    variables[`--brand-${step}`] = scale[step].join(" ");
  }
  return variables;
}
