import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, resolveLocale, type Locale } from "@skolara/i18n";
import { LOCALE_COOKIE } from "./locale-cookie";

/**
 * The locale for this request: an explicit choice wins, otherwise the
 * browser's Accept-Language decides. Resolved on the server so the first
 * paint is already in the right language and direction — a flash of English
 * before switching to Urdu would also flip the layout direction, which is
 * far more jarring than a normal FOUC.
 */
export async function currentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const chosen = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const headerList = await headers();
  const acceptLanguage = headerList.get("accept-language");
  if (!acceptLanguage) return DEFAULT_LOCALE;

  // "ur-PK,ur;q=0.9,en;q=0.8" → ["ur-PK", "ur", "en"], best first.
  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag ?? "", quality: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag);

  return resolveLocale(preferred);
}
