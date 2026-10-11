/**
 * Returns the address only if it is plain http or https, otherwise null.
 *
 * Every link or image whose address came from a user or from storage goes
 * through this before it reaches an `href` or `src`. The API refuses other
 * schemes on the way in; this is the second lock, for rows that predate that
 * rule and for anything that reached the database another way.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
