import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClientProvider } from "@skolara/api-client";
import { I18nProvider, resolveLocale, type Locale } from "@skolara/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getLocales } from "expo-localization";
import { apiClient } from "./api-client";

const LOCALE_KEY = "skolara_locale";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // Start from the device's own language — a parent whose phone is in Urdu
  // shouldn't have to find a setting before the app is readable.
  const [locale, setLocale] = useState<Locale>(() =>
    resolveLocale(getLocales().map((entry) => entry.languageTag)),
  );

  useEffect(() => {
    // An explicit choice from a previous session overrides the device default.
    AsyncStorage.getItem(LOCALE_KEY)
      .then((stored) => {
        if (stored === "en" || stored === "ur") setLocale(stored);
      })
      .catch(() => undefined);
  }, []);

  const persistLocale = useCallback((next: Locale) => {
    AsyncStorage.setItem(LOCALE_KEY, next).catch(() => undefined);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <I18nProvider initialLocale={locale} onLocaleChange={persistLocale}>
          {children}
        </I18nProvider>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
