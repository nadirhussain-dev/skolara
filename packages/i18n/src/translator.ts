import { DEFAULT_LOCALE, type Locale } from "./locales";
import { en, type Messages } from "./messages/en";
import { ur } from "./messages/ur";

export const CATALOGUES: Record<Locale, Messages> = { en, ur };

/**
 * Every dotted path to a leaf string in the catalogue — "auth.signIn",
 * "nav.students", and so on. Typing `t` against this means a mistyped or
 * removed key is a compile error, not a dotted path rendered to a user.
 */
type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafPaths<T[K]>}`;
}[keyof T & string];

export type MessageKey = LeafPaths<Messages>;

export type TranslationValues = Record<string, string | number>;

function lookup(catalogue: Messages, key: string): string | undefined {
  const value = key
    .split(".")
    .reduce<unknown>(
      (node, segment) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[segment]
          : undefined,
      catalogue,
    );
  return typeof value === "string" ? value : undefined;
}

function interpolate(message: string, values?: TranslationValues): string {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export type Translate = (key: MessageKey, values?: TranslationValues) => string;

/**
 * Builds a `t` for one locale.
 *
 * A key missing from a non-default catalogue falls back to English rather
 * than rendering the raw path: a half-translated screen is a much better
 * failure than one showing "attendance.syncNow" to a parent.
 */
export function createTranslator(locale: Locale): Translate {
  const catalogue = CATALOGUES[locale] ?? CATALOGUES[DEFAULT_LOCALE];

  return (key, values) => {
    const message = lookup(catalogue, key) ?? lookup(CATALOGUES[DEFAULT_LOCALE], key);
    if (message === undefined) {
      // Only reachable if a caller bypasses the types; surface it loudly in
      // development rather than rendering an empty string.
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] Missing message for key "${key}"`);
      }
      return key;
    }
    return interpolate(message, values);
  };
}
