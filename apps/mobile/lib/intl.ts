import type { Locale } from "@skolara/i18n";

/**
 * The BCP-47 tag `Intl` should use for each of our locales. The web app keeps
 * the same mapping for the same reasons: bare "en" gives American month-first
 * dates, wrong for every market this is sold into and inconsistent with the
 * en-GB the API stamps on absence alerts; and bare "ur" resolves differently
 * across engines where "ur-PK" is what a Pakistani family actually reads.
 */
const INTL_LOCALE: Record<Locale, string> = {
  en: "en-GB",
  ur: "ur-PK",
};

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}
