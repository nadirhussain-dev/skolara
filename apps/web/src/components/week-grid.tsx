"use client";

import { useTranslation } from "@skolara/i18n";
import { TEACHING_DAYS, type DayOfWeek, type Period } from "@skolara/types";
import { cn } from "@skolara/ui";
import type { ReactNode } from "react";

const PALETTE = [
  "bg-brand-50 border-brand-200 text-brand-900 dark:bg-brand-900/40 dark:border-brand-800 dark:text-brand-100",
  "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-100",
  "bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-100",
  "bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-100",
  "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-100",
  "bg-violet-50 border-violet-200 text-violet-900 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-100",
  "bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-100",
  "bg-orange-50 border-orange-200 text-orange-950 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-100",
];

/** The same subject is the same colour everywhere, so a week reads at a glance. */
export function subjectColour(subject: string): string {
  let hash = 0;
  for (const char of subject.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length]!;
}

/** Monday to Saturday against the school's periods. Each cell is rendered by the caller. */
export function WeekGrid({
  periods,
  cell,
  label,
}: {
  periods: Period[];
  cell: (day: DayOfWeek, period: Period) => ReactNode;
  label: string;
}) {
  const { t } = useTranslation();
  const todayIndex = (new Date().getDay() + 6) % 7;
  return (
    <div className="overflow-x-auto">
      <table aria-label={label} className="w-full min-w-[780px] table-fixed border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-28 px-2 text-start text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t("timetable.period")}</th>
            {TEACHING_DAYS.map((day, i) => (
              <th key={day} scope="col" className={cn("rounded-lg px-2 py-1.5 text-start text-xs font-bold uppercase", i === todayIndex ? "bg-brand-700 text-white" : "text-slate-600 dark:text-slate-400")}>
                {t(`days.short.${day}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.id}>
              <th scope="row" className="px-2 text-start align-top">
                <span className="block font-extrabold text-slate-900 dark:text-slate-50">{period.name}</span>
                <span className="block text-xs font-medium tabular-nums text-slate-600 dark:text-slate-400" dir="ltr">{period.startTime}–{period.endTime}</span>
              </th>
              {TEACHING_DAYS.map((day) => (
                <td key={day} className="h-[4.5rem] align-top">{cell(day, period)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
