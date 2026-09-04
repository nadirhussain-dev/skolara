import type { Locale } from "@skolara/i18n";

/**
 * The BCP-47 tag `Intl` should use for each of our locales.
 *
 * Two reasons this is a mapping rather than passing the locale straight
 * through. `Intl` wants a region to pick a date order, and bare "en" gives
 * American month-first — wrong for every market this product is sold into;
 * "en-GB" matches what the API already stamps on absence alerts, so a date in
 * a WhatsApp message and the same date on screen finally agree. And Urdu
 * without a region resolves inconsistently across engines, where "ur-PK" is
 * what a Pakistani school actually reads.
 */
const INTL_LOCALE: Record<Locale, string> = {
  en: "en-GB",
  ur: "ur-PK",
};

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}
