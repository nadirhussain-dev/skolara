import type { FinanceOverview } from "@skolara/types";

/** "YYYY-MM" for a date in the viewer's own timezone. */
export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parts(month: string): [number, number] {
  return [Number(month.slice(0, 4)), Number(month.slice(5, 7))];
}

export function shiftMonth(month: string, by: number): string {
  const [year, monthNumber] = parts(month);
  const moved = new Date(Date.UTC(year, monthNumber - 1 + by, 1));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "October 2026" in the given Intl locale. */
export function monthLabel(month: string, intlLocale: string, style: "long" | "short" = "long"): string {
  const [year, monthNumber] = parts(month);
  return new Intl.DateTimeFormat(intlLocale, {
    month: style,
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

/** Today as YYYY-MM-DD if it falls inside `month`, otherwise the month's first day. */
export function defaultSpentOn(month: string, now: Date = new Date()): string {
  if (currentMonthKey(now) === month) {
    return `${month}-${String(now.getDate()).padStart(2, "0")}`;
  }
  return `${month}-01`;
}

/**
 * Reads a typed rupee amount. Accepts "90,000" and "90000.50"; returns null
 * for anything that is not a non-negative number with at most 2 decimals.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value <= 9_999_999_999.99 ? value : null;
}

export function overBudgetCategories(overview: FinanceOverview) {
  return overview.categories
    .filter((c) => c.budget !== null && c.spent > c.budget)
    .map((c) => ({ name: c.name, over: Math.round((c.spent - (c.budget as number)) * 100) / 100 }));
}

function csvCell(value: string | number): string {
  let text = String(value);
  // A cell starting with = + - @ is run as a formula by Excel. Category and
  // payee names are typed by people, so neutralise them.
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The monthly statement as CSV rows: income, then each category, then totals. */
export function statementCsv(overview: FinanceOverview): string {
  const rows: Array<Array<string | number>> = [
    ["Monthly statement", overview.month],
    [],
    ["Income"],
    ["Fee payments verified", overview.income],
    [],
    ["Expenses", "Budget", "Spent", "Left"],
    ...overview.categories.map((c) => [
      c.name,
      c.budget ?? "",
      c.spent,
      c.budget === null ? "" : Math.round((c.budget - c.spent) * 100) / 100,
    ]),
    ["Total", overview.budgetTotal, overview.spent, Math.round((overview.budgetTotal - overview.spent) * 100) / 100],
    [],
    ["Net", overview.net],
    ["Unpaid fees past due", overview.unpaidFees],
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
