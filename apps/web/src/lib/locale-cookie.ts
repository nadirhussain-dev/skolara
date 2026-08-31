/**
 * Shared between the server-side resolver and the client-side switcher, so it
 * lives apart from `locale.ts` — that module imports `next/headers`, which
 * can't be pulled into a client component.
 */
export const LOCALE_COOKIE = "skolara_locale";
