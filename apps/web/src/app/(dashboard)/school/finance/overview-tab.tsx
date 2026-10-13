"use client";

import { useTranslation } from "@skolara/i18n";
import type { FinanceOverview } from "@skolara/types";
import { Button, Card, CardTitle, ProgressBar, StatCard, cn } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import { intlLocale } from "@/lib/intl";
import { monthLabel, overBudgetCategories } from "./finance-helpers";
import type { FinanceTab } from "./page";

export function CategoryTable({ overview }: { overview: FinanceOverview }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="text-start text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <th scope="col" className="py-2 text-start">{t("finance.category")}</th>
            <th scope="col" className="py-2 text-end">{t("finance.budget")}</th>
            <th scope="col" className="py-2 ps-3 text-end">{t("finance.spent")}</th>
            <th scope="col" className="py-2 text-end">{t("finance.left")}</th>
            <th scope="col" className="w-40 py-2 ps-4 text-start">{t("finance.budgetUsed")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {overview.categories.map((c) => {
            const over = c.budget !== null && c.spent > c.budget;
            const used = c.budget ? (c.spent / c.budget) * 100 : 0;
            return (
              <tr key={c.categoryId}>
                <th scope="row" className="py-3 text-start font-bold text-slate-900 dark:text-slate-50">
                  {c.name}
                  {c.pending > 0 && (
                    <span className="ms-2 inline-block whitespace-nowrap rounded-full bg-accent-100 px-2 py-0.5 text-xs font-bold text-[#78350F]">
                      {t("finance.waiting")} {formatCurrency(c.pending)}
                    </span>
                  )}
                </th>
                <td className="py-3 text-end tabular-nums text-slate-700 dark:text-slate-300">
                  {c.budget === null ? "–" : formatCurrency(c.budget)}
                </td>
                <td className="py-3 ps-3 text-end font-bold tabular-nums">{formatCurrency(c.spent)}</td>
                <td className={cn("py-3 text-end font-bold tabular-nums", over ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-300")}>
                  {c.budget === null
                    ? t("finance.notBudgeted")
                    : over
                      ? t("finance.overBy", { amount: formatCurrency(c.spent - c.budget) })
                      : formatCurrency(c.budget - c.spent)}
                </td>
                <td className="py-3 ps-4">
                  {c.budget !== null && (
                    <ProgressBar size="sm" value={used} tone={over ? "danger" : "brand"} label={`${c.name}: ${Math.round(used)}%`} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Two bars per month. The table underneath carries the same numbers for screen readers. */
function Trend({ overview }: { overview: FinanceOverview }) {
  const { t, locale } = useTranslation();
  const max = Math.max(1, ...overview.trend.flatMap((m) => [m.income, m.spent]));
  return (
    <div>
      <div aria-hidden className="flex h-40 items-end gap-3">
        {overview.trend.map((m) => (
          <div key={m.month} className="flex h-full flex-1 flex-col justify-end gap-1.5">
            <div className="flex flex-1 items-end justify-center gap-1">
              <div className="w-1/3 max-w-[1.25rem] rounded-t bg-brand-600" style={{ height: `${Math.max(m.income > 0 ? 2 : 0, (m.income / max) * 100)}%` }} />
              <div className="w-1/3 max-w-[1.25rem] rounded-t bg-slate-400 dark:bg-slate-500" style={{ height: `${Math.max(m.spent > 0 ? 2 : 0, (m.spent / max) * 100)}%` }} />
            </div>
            <div className="text-center text-xs font-bold text-slate-600 dark:text-slate-400">
              {monthLabel(m.month, intlLocale(locale), "short")}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm font-bold text-slate-700 dark:text-slate-300">
        <span className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-brand-600" />{t("finance.income")}</span>
        <span className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-slate-400" />{t("finance.spent")}</span>
      </div>
      <table className="sr-only">
        <caption>{t("finance.trendCaption")}</caption>
        <thead><tr><th scope="col">{t("finance.month")}</th><th scope="col">{t("finance.income")}</th><th scope="col">{t("finance.spent")}</th></tr></thead>
        <tbody>
          {overview.trend.map((m) => (
            <tr key={m.month}><th scope="row">{monthLabel(m.month, intlLocale(locale))}</th><td>{formatCurrency(m.income)}</td><td>{formatCurrency(m.spent)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OverviewTab({ overview, onOpen }: { overview: FinanceOverview; onOpen: (tab: FinanceTab) => void }) {
  const { t } = useTranslation();
  const over = overBudgetCategories(overview);
  const used = overview.budgetUsedPercent;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("finance.income")} value={formatCurrency(overview.income)} hint={t("finance.incomeHint", { count: overview.verifiedPaymentCount })} tone="brand" />
        <StatCard label={t("finance.spent")} value={formatCurrency(overview.spent)} hint={t("finance.spentHint")} />
        <StatCard
          label={t("finance.net")}
          value={formatCurrency(overview.net)}
          hint={overview.net >= 0 ? t("finance.netSurplus") : t("finance.netDeficit")}
          tone={overview.net >= 0 ? "success" : "danger"}
        />
        <StatCard
          label={t("finance.unpaidFees")}
          value={formatCurrency(overview.unpaidFees)}
          hint={t("finance.unpaidFeesHint", { count: overview.unpaidInvoiceCount })}
          tone={overview.unpaidFees > 0 ? "warning" : "success"}
        />
      </div>

      {overview.pendingExpenseCount > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-accent-300 bg-accent-50 dark:border-accent-700 dark:bg-accent-900/20">
          <div>
            <p className="font-extrabold text-slate-900 dark:text-slate-50">{t("finance.toApprove")}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {t("finance.toApproveCount", { count: overview.pendingExpenseCount, amount: formatCurrency(overview.pendingExpenseAmount) })}
            </p>
          </div>
          <Button variant="accent" onClick={() => onOpen("expenses")}>{t("home.review")}</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle>{t("finance.budgetUsed")}</CardTitle>
            {used !== null && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("finance.budgetUsedOf", { spent: formatCurrency(overview.spent), budget: formatCurrency(overview.budgetTotal) })}
                {" · "}
                <span className="font-extrabold text-slate-900 dark:text-slate-50">{Math.round(used)}%</span>
              </p>
            )}
          </div>
          {used === null ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-sm text-slate-700 dark:text-slate-300">{t("finance.noBudget")}</p>
              <Button variant="secondary" onClick={() => onOpen("budget")}>{t("finance.setBudget")}</Button>
            </div>
          ) : (
            <>
              <ProgressBar className="mt-4" value={used} tone={used > 100 ? "danger" : "brand"} label={t("finance.budgetUsed")} />
              {over.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {over.map((c) => (
                    <li key={c.name} className="rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-900 dark:bg-red-950/50 dark:text-red-200">
                      {t("finance.overBudgetBy", { name: c.name, amount: formatCurrency(c.over) })}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4"><CategoryTable overview={overview} /></div>
            </>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>{t("finance.trend")}</CardTitle>
          <div className="mt-4"><Trend overview={overview} /></div>
        </Card>
      </div>
    </div>
  );
}
