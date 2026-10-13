"use client";

import { useExamRankList } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { EmptyState, ProgressBar } from "@skolara/ui";
import { ListState } from "@/components/ui-kit";

export function Ranking({ examId }: { examId: string }) {
  const { t } = useTranslation();
  const ranks = useExamRankList(examId);

  if (ranks.isError || !ranks.data) {
    return <ListState isError={ranks.isError} isLoading={!ranks.data} onRetry={() => void ranks.refetch()} errorText={t("examResults.loadError")} />;
  }
  if (ranks.data.length === 0) {
    return <EmptyState title={t("examResults.noResultsTitle")} description={t("examResults.noResultsBody")} />;
  }
  const average = ranks.data.reduce((sum, row) => sum + row.percentage, 0) / ranks.data.length;
  const highest = Math.max(...ranks.data.map((row) => row.percentage));

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <dt className="text-xs font-bold text-slate-600 dark:text-slate-400">{t("examResults.classAverage")}</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{average.toFixed(1)}%</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <dt className="text-xs font-bold text-slate-600 dark:text-slate-400">{t("examResults.highest")}</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{highest.toFixed(1)}%</dd>
        </div>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <th scope="col" className="w-14 py-2 text-start">{t("examResults.rank")}</th>
              <th scope="col" className="py-2 text-start">{t("people.student")}</th>
              <th scope="col" className="py-2 text-end">{t("examResults.total")}</th>
              <th scope="col" className="w-48 py-2 ps-4 text-start">{t("examResults.percent")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {ranks.data.map((row) => {
              const name = `${row.firstName} ${row.lastName}`;
              return (
                <tr key={row.studentId}>
                  <td className="py-2.5 text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{row.rank}</td>
                  <th scope="row" className="py-2.5 text-start font-bold text-slate-900 dark:text-slate-50">{name}</th>
                  <td className="py-2.5 text-end tabular-nums text-slate-700 dark:text-slate-300">{row.totalMarksObtained} / {row.totalMaxMarks}</td>
                  <td className="py-2.5 ps-4">
                    <div className="flex items-center gap-2">
                      <ProgressBar size="sm" value={row.percentage} label={`${name}: ${row.percentage.toFixed(1)}%`} tone={row.percentage >= 40 ? "brand" : "danger"} className="flex-1" />
                      <span className="w-14 text-end font-bold tabular-nums">{row.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
