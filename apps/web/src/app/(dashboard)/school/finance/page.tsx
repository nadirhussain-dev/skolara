"use client";

import { useFinanceOverview } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, Skeleton, cn } from "@skolara/ui";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";
import { BudgetTab } from "./budget-tab";
import { ExpensesTab } from "./expenses-tab";
import { currentMonthKey, monthLabel, shiftMonth } from "./finance-helpers";
import { OverviewTab } from "./overview-tab";
import { ReportsTab } from "./reports-tab";

const TABS = ["overview", "budget", "expenses", "reports"] as const;
export type FinanceTab = (typeof TABS)[number];

const TAB_LABEL = {
  overview: "finance.tabOverview",
  budget: "finance.tabBudget",
  expenses: "finance.tabExpenses",
  reports: "finance.tabReports",
} as const;

/**
 * School money in one place: the month at a glance, the budget, the expenses
 * and a statement to hand to the owner. One month is in view at a time and
 * every tab follows it.
 */
export default function FinancePage() {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<FinanceTab>("overview");
  const [month, setMonth] = useState(() => currentMonthKey());
  const overview = useFinanceOverview(month);
  const isCurrentMonth = month === currentMonthKey();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {t("finance.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("finance.subtitle")}</p>
        </div>
        <div
          role="group"
          aria-label={t("finance.month")}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
        >
          <button
            type="button"
            aria-label={t("finance.previousMonth")}
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <span aria-live="polite" className="min-w-[9.5rem] px-2 text-center text-sm font-extrabold text-slate-900 dark:text-slate-50">
            {monthLabel(month, intlLocale(locale))}
          </span>
          <button
            type="button"
            aria-label={t("finance.nextMonth")}
            disabled={isCurrentMonth}
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div role="tablist" aria-label={t("finance.title")} className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800 print:hidden">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`finance-tab-${key}`}
            aria-selected={tab === key}
            aria-controls="finance-panel"
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px flex h-11 items-center gap-2 border-b-[3px] px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700",
              tab === key
                ? "border-brand-700 text-brand-800 dark:border-brand-300 dark:text-brand-200"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {t(TAB_LABEL[key])}
            {key === "expenses" && (overview.data?.pendingExpenseCount ?? 0) > 0 && (
              <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-extrabold text-[#1E1B4B]">
                {overview.data?.pendingExpenseCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="finance-panel" aria-labelledby={`finance-tab-${tab}`}>
        {overview.isError ? (
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
              {t("finance.loadError")}
            </p>
            <Button variant="secondary" onClick={() => void overview.refetch()}>
              {t("common.retry")}
            </Button>
          </Card>
        ) : !overview.data ? (
          <div className="flex flex-col gap-4" aria-busy>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[7.25rem] rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        ) : tab === "overview" ? (
          <OverviewTab overview={overview.data} onOpen={setTab} />
        ) : tab === "budget" ? (
          <BudgetTab key={month} overview={overview.data} />
        ) : tab === "expenses" ? (
          <ExpensesTab key={month} overview={overview.data} />
        ) : (
          <ReportsTab overview={overview.data} />
        )}
      </div>
    </div>
  );
}
