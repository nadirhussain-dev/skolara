"use client";

import { useMySchool } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { FinanceOverview } from "@skolara/types";
import { Button, Card } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import { saveCsv } from "@/lib/download";
import { intlLocale } from "@/lib/intl";
import { monthLabel, overBudgetCategories, statementCsv } from "./finance-helpers";
import { CategoryTable } from "./overview-tab";

/** A one-page statement for the month. Printing it gives the PDF. */
export function ReportsTab({ overview }: { overview: FinanceOverview }) {
  const { t, locale } = useTranslation();
  const school = useMySchool();
  const label = monthLabel(overview.month, intlLocale(locale));
  const over = overBudgetCategories(overview);
  const variance = Math.round((overview.budgetTotal - overview.spent) * 100) / 100;
  const prepared = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  const summary = [
    t("finance.summaryCollected", { income: formatCurrency(overview.income), spent: formatCurrency(overview.spent) }),
    overview.budgetTotal > 0
      ? variance >= 0
        ? t("finance.summaryUnder", { amount: formatCurrency(variance) })
        : t("finance.summaryOver", { amount: formatCurrency(-variance) })
      : "",
    over.length > 0 ? t("finance.summaryOverCategories", { names: over.map((c) => c.name).join(", ") }) : "",
    overview.unpaidInvoiceCount > 0
      ? t("finance.summaryUnpaid", { count: overview.unpaidInvoiceCount, amount: formatCurrency(overview.unpaidFees) })
      : "",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("finance.reportsIntro")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => saveCsv(statementCsv(overview), `statement-${overview.month}.csv`)}>
            {t("finance.downloadCsv")}
          </Button>
          <Button onClick={() => window.print()}>{t("finance.print")}</Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="bg-brand-700 px-6 py-5 text-white print:bg-white print:text-black">
          <p className="text-lg font-extrabold">{t("finance.statementTitle", { month: label })}</p>
          <p className="text-sm opacity-90">
            {school.data?.name ? `${school.data.name} · ` : ""}
            {t("finance.preparedOn", { date: prepared })}
          </p>
        </div>
        <div className="flex flex-col gap-5 p-6">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <dt className="text-xs font-bold text-slate-600 dark:text-slate-400">{t("finance.totalIncome")}</dt>
              <dd className="text-xl font-extrabold tabular-nums">{formatCurrency(overview.income)}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <dt className="text-xs font-bold text-slate-600 dark:text-slate-400">{t("finance.totalExpenses")}</dt>
              <dd className="text-xl font-extrabold tabular-nums">{formatCurrency(overview.spent)}</dd>
            </div>
            <div className={`rounded-xl p-3 ${overview.net >= 0 ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200"}`}>
              <dt className="text-xs font-bold">{t("finance.net")}</dt>
              <dd className="text-xl font-extrabold tabular-nums">{formatCurrency(overview.net)}</dd>
            </div>
          </dl>

          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("finance.income")}</h2>
            <p className="mt-2 flex justify-between gap-3 border-t border-slate-100 py-2 text-sm dark:border-slate-800">
              <span>{t("finance.feePayments")} ({overview.verifiedPaymentCount})</span>
              <span className="font-bold tabular-nums">{formatCurrency(overview.income)}</span>
            </p>
          </div>

          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("finance.tabExpenses")}</h2>
            <div className="mt-1"><CategoryTable overview={overview} /></div>
          </div>

          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            <b className="text-slate-900 dark:text-slate-50">{t("finance.inShort")}</b> {summary.join(" ")}
          </p>
        </div>
      </Card>
    </div>
  );
}
