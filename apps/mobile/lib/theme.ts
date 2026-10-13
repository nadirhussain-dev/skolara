/**
 * Shared design tokens for the Skolara mobile app.
 *
 * Mirrors the default brand/accent palette in packages/config/tailwind-preset.js
 * so the mobile app and web dashboard read as one product.
 */

export const colors = {
  // Indigo — the Skolara default. Matches the web default scale derived by
  // `brandScale` in @skolara/utils; a school's own colour will replace it
  // once the mobile theme is made dynamic.
  brand: {
    50: "#F1F1F9",
    100: "#E3E2F2",
    200: "#C7C5E5",
    300: "#A5A2D6",
    400: "#7F7BC4",
    500: "#5F59B5",
    600: "#4741AA",
    700: "#3730A3",
    800: "#2D2786",
    900: "#211D62",
  },
  // Amber — highlights only (fee due, unread, achievement). Text on it is dark.
  accent: {
    100: "#FEF3C7",
    300: "#FCD34D",
    500: "#F59E0B",
    700: "#B45309",
  },
  // Same amber ramp under its semantic name, for "pending" and "late".
  warningScale: {
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
  infoBg: "#F1F1F9",
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
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
  warning: { fg: colors.warningScale[700], bg: colors.warningScale[100] },
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
  glow: {
    shadowColor: "#3730A3",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};
