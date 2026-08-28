"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  isLocale,
  type Locale,
} from "./locales";
import { createTranslator, type Translate } from "./translator";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  /** Server-resolved locale, so the first paint isn't in the wrong language. */
  initialLocale?: Locale;
  /**
   * Called whenever the locale changes, for persisting the choice. Kept as a
   * callback so this package doesn't have to know about cookies on web or
   * SecureStore on mobile.
   */
  onLocaleChange?: (locale: Locale) => void;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  onLocaleChange,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      setLocaleState(next);
      onLocaleChange?.(next);
    },
    [onLocaleChange],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: createTranslator(locale),
      dir: LOCALE_META[locale].dir,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used inside an <I18nProvider>");
  }
  return context;
}
