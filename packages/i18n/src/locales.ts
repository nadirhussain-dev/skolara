export const LOCALES = ["en", "ur"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export interface LocaleMeta {
  code: Locale;
  /** English name, for settings screens shown in English. */
  name: string;
  /** The language's own name — what a speaker of it expects to see. */
  nativeName: string;
  dir: "ltr" | "rtl";
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  ur: { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the best supported locale from an Accept-Language header or a device
 * locale list. Matches on the language subtag, so "ur-PK" resolves to "ur".
 */
export function resolveLocale(preferred: readonly string[] | undefined): Locale {
  for (const candidate of preferred ?? []) {
    const language = candidate.split("-")[0]?.toLowerCase();
    if (isLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}
