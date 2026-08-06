/**
 * Shared design tokens for the Skolara mobile app.
 *
 * Mirrors the brand/accent palette in packages/config/tailwind-preset.js so the
 * mobile app and web dashboard read as one product.
 */

export const colors = {
  brand: {
    50: "#EEF0FC",
    100: "#DCE0F9",
    300: "#8B94E0",
    500: "#4F46C7",
    700: "#3730A3",
    900: "#241E6B",
  },
  accent: {
    100: "#FEF3C7",
    300: "#FCD34D",
    500: "#F59E0B",
    700: "#B45309",
  },
  slate: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },
  success: "#059669",
  successBg: "#D1FAE5",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  info: "#3730A3",
  infoBg: "#EEF0FC",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: "700" as const, color: colors.slate[900] },
  heading: { fontSize: 18, fontWeight: "700" as const, color: colors.slate[900] },
  subheading: { fontSize: 15, fontWeight: "600" as const, color: colors.slate[700] },
  body: { fontSize: 15, color: colors.slate[700] },
  muted: { fontSize: 13, color: colors.slate[500] },
  label: { fontSize: 13, fontWeight: "600" as const, color: colors.slate[600] },
};

/** Tone → color mapping for status pills/badges across the app. */
export const tones = {
  neutral: { fg: colors.slate[600], bg: colors.slate[100] },
  brand: { fg: colors.brand[700], bg: colors.brand[50] },
  success: { fg: colors.success, bg: colors.successBg },
  warning: { fg: colors.accent[700], bg: colors.warningBg },
  danger: { fg: colors.danger, bg: colors.dangerBg },
} as const;

export type Tone = keyof typeof tones;

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
};
