import type { FinanceOverview } from "@skolara/types";
import {
  currentMonthKey,
  defaultSpentOn,
  monthLabel,
  overBudgetCategories,
  parseAmount,
  shiftMonth,
  statementCsv,
} from "./finance-helpers";

const overview: FinanceOverview = {
  month: "2026-10",
  income: 2340000,
  verifiedPaymentCount: 310,
  spent: 172000,
  net: 2168000,
  budgetTotal: 150000,
  budgetUsedPercent: 114.7,
  pendingExpenseCount: 0,
  pendingExpenseAmount: 0,
  unpaidFees: 661500,
  unpaidInvoiceCount: 9,
  categories: [
    { categoryId: "a", name: "Utilities", archived: false, budget: 100000, spent: 114000, pending: 0 },
    { categoryId: "b", name: "Supplies", archived: false, budget: 50000, spent: 48000, pending: 0 },
    { categoryId: "c", name: "=cmd|'/c calc'!A1", archived: false, budget: null, spent: 10000, pending: 0 },
  ],
  trend: [],
};

describe("finance helpers", () => {
  it("moves between months across year ends", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
  });

  it("names the current month from local time", () => {
    expect(currentMonthKey(new Date(2026, 9, 12))).toBe("2026-10");
  });

  it("labels a month", () => {
    expect(monthLabel("2026-10", "en-GB")).toBe("October 2026");
    expect(monthLabel("2026-10", "en-GB", "short")).toBe("Oct");
  });

  it("defaults the expense date to today only inside the month shown", () => {
    expect(defaultSpentOn("2026-10", new Date(2026, 9, 12))).toBe("2026-10-12");
    expect(defaultSpentOn("2026-09", new Date(2026, 9, 12))).toBe("2026-09-01");
  });

  it("parses typed amounts and refuses anything else", () => {
    expect(parseAmount("90,000")).toBe(90000);
    expect(parseAmount(" 1 500.50 ")).toBe(1500.5);
    expect(parseAmount("0")).toBe(0);
    for (const bad of ["", "-5", "1.234", "abc", "1e5", "12.", "99999999999"]) {
      expect(parseAmount(bad)).toBeNull();
    }
  });

  it("lists categories that are over budget", () => {
    expect(overBudgetCategories(overview)).toEqual([{ name: "Utilities", over: 14000 }]);
  });

  it("builds a statement CSV and neutralises formula cells", () => {
    const csv = statementCsv(overview);
    expect(csv).toContain("Utilities,100000,114000,-14000");
    expect(csv).toContain("Total,150000,172000,-22000");
    expect(csv).toContain("\r\n'=cmd|'/c calc'!A1,,10000,");
    expect(csv.split("\r\n")[0]).toBe("Monthly statement,2026-10");
  });
});
