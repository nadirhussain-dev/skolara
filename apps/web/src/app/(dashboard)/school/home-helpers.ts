/** Today's date in the viewer's own timezone, as the API expects it. */
export function localDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type DayPart = "morning" | "afternoon" | "evening";

export function dayPart(now: Date = new Date()): DayPart {
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * Whole calendar days between two moments, by local date — something sent at
 * 11pm last night is "yesterday" at 8am, not "today" for being under 24h old.
 */
export function calendarDaysBetween(earlier: Date, later: Date = new Date()): number {
  const start = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const end = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

/**
 * "5-B", wrapped in directional isolates. Without them a right-to-left page
 * reorders the pieces around the hyphen — "5-B" reads "B-5", and a list like
 * "5-A, 8-B" comes out scrambled.
 */
export function classLabel(name: string, section: string | null): string {
  // A class with no section is just its name — never "5-null".
  return `\u2066${section ? `${name}-${section}` : name}\u2069`;
}
