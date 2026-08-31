"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClientProvider } from "@skolara/api-client";
import { I18nProvider, LOCALE_META, type Locale } from "@skolara/i18n";
import { useCallback, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import { AuthProvider } from "@/lib/auth-context";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";

export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [queryClient] = useState(() => new QueryClient());

  const persistLocale = useCallback((locale: Locale) => {
    // A cookie rather than localStorage so the server can resolve the same
    // locale on the next request and render the first paint correctly.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    // Urdu is RTL — the whole document direction has to follow the choice,
    // not just the text.
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_META[locale].dir;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <I18nProvider initialLocale={initialLocale} onLocaleChange={persistLocale}>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
