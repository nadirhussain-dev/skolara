/**
 * Working days in an inclusive date range.
 *
 * Sunday is the only non-working day: the school week runs Monday to Saturday
 * across most of the target market, so counting calendar days would charge a
 * teacher for a weekend they were never working.
 *
 * Deliberately does not consult the school calendar for public holidays. That
 * would make a leave balance depend on whether an admin had entered next
 * year's holidays yet, which is a worse failure than being a day generous.
 */
export function workingDaysBetween(start: Date, end: Date): number {
  // Normalise to date-only *before* comparing. Comparing the raw values would
  // make a same-day range with an inverted time component (a 3pm "start" and
  // an 8am "end") return zero, when a leave day is a whole day either way.
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (last < cursor.getTime()) return 0;

  let days = 0;

  while (cursor.getTime() <= last) {
    if (cursor.getUTCDay() !== 0) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
