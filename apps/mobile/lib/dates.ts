/** Today as YYYY-MM-DD in the phone's own timezone. */
export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM" for the phone's current month. */
export function monthKey(now: Date = new Date()): string {
  return todayKey(now).slice(0, 7);
}

/** The calendar day a stored date falls on, as YYYY-MM-DD. Register dates are stored as UTC midnight. */
export function dayKeyOf(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** "12 Oct" or "12 Oct 2026" in the app language. */
export function formatDay(value: Date | string, locale: string, withYear = false): string {
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(value));
}

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 minutes ago", "yesterday". Falls back to a date once it is more than a week old. */
export function timeAgo(value: Date | string, locale: string, now: Date = new Date()): string {
  const then = new Date(value);
  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) > 7 * 86400) return formatDay(then, locale);
  const tag = locale === "ur" ? "ur-PK" : "en-GB";
  // Hermes ships Intl.RelativeTimeFormat on current Expo SDKs; older engines get a date.
  if (typeof Intl.RelativeTimeFormat !== "function") return formatDay(then, locale);
  const format = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "second");
}
