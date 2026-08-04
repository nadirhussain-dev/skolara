/**
 * Sequence must come from an atomic DB counter (e.g. per-school, per-year) —
 * this only formats it, so callers stay collision-free across concurrent submissions.
 */
export function formatPaymentReference(
  year: number,
  sequence: number,
  prefix: string = "SKL",
): string {
  return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}
