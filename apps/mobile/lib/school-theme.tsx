import AsyncStorage from "@react-native-async-storage/async-storage";
import { LOCALE_META, useTranslation } from "@skolara/i18n";
import type { PublicSchool } from "@skolara/types";
import { BRAND_STEPS, brandScale, isHexColor, rgbToHex, type BrandStep } from "@skolara/utils";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { colors as baseColors } from "./theme";

const STORAGE_KEY = "skolara_school";

export type BrandColors = Record<BrandStep, string>;

function scaleFor(color: string | null | undefined): BrandColors {
  // `brandScale` darkens a colour that is too light for white text, so every
  // school's buttons and headers stay readable whatever they picked.
  const scale = brandScale(isHexColor(color) ? color : null);
  return Object.fromEntries(BRAND_STEPS.map((step) => [step, rgbToHex(scale[step])])) as BrandColors;
}

export interface AppTheme {
  /** The school this phone is set up for, or null before a code is entered. */
  school: PublicSchool | null;
  /** The school's colour as a 50 to 900 scale; Skolara indigo until a school is known. */
  brand: BrandColors;
  /** False until the remembered school has been read from storage. */
  isLoaded: boolean;
  /** True when the app language reads right to left. */
  isRTL: boolean;
  setSchool: (school: PublicSchool | null) => void;
}

const ThemeContext = createContext<AppTheme | null>(null);

function isPublicSchool(value: unknown): value is PublicSchool {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.subdomain === "string" &&
    (v.logoUrl === null || typeof v.logoUrl === "string") &&
    (v.primaryColor === null || typeof v.primaryColor === "string")
  );
}

/**
 * Holds the school this phone belongs to and the colours that follow from
 * it. The school is remembered between launches, so the app opens in the
 * school's colours from the first frame after the first sign-in.
 */
export function SchoolThemeProvider({ children }: { children: ReactNode }) {
  const { locale } = useTranslation();
  const [school, setSchoolState] = useState<PublicSchool | null>(null);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (isPublicSchool(parsed)) setSchoolState(parsed);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setSchool = useCallback((next: PublicSchool | null) => {
    setSchoolState(next);
    const write = next ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)) : AsyncStorage.removeItem(STORAGE_KEY);
    write.catch(() => undefined);
  }, []);

  const value = useMemo<AppTheme>(
    () => ({
      school,
      brand: scaleFor(school?.primaryColor),
      isLoaded,
      isRTL: LOCALE_META[locale].dir === "rtl",
      setSchool,
    }),
    [school, isLoaded, locale, setSchool],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside SchoolThemeProvider");
  return theme;
}

/** Fixed colours that never change with the school: text, surfaces and status. */
export const palette = {
  ink: baseColors.slate[900],
  body: baseColors.slate[700],
  // slate-600, not 500: small grey text on white has to clear 4.5:1.
  muted: baseColors.slate[600],
  line: baseColors.slate[200],
  surface: baseColors.white,
  page: baseColors.slate[50],
  field: baseColors.slate[300],
  success: "#047857",
  successBg: "#D1FAE5",
  danger: "#B91C1C",
  dangerBg: "#FEE2E2",
  warning: "#92400E",
  warningBg: "#FEF3C7",
  accent: "#F59E0B",
  accentInk: "#1E1B4B",
} as const;
