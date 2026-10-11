"use client";

import { useSchoolDayAttendance } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Badge, Button, Card, EmptyState, ProgressBar, Skeleton, StatCard } from "@skolara/ui";
import { useState } from "react";
import { PageTitle } from "@/components/ui-kit";
import { intlLocale } from "@/lib/intl";
import { classLabel, localDateKey } from "../home-helpers";
import { RegisterPanel } from "./register-panel";

function shiftDay(date: string, by: number): string {
  const moved = new Date(`${date}T00:00:00.000Z`);
  moved.setUTCDate(moved.getUTCDate() + by);
  return moved.toISOString().slice(0, 10);
}

/** The school's attendance for one day, and the way into each class register. */
export default function SchoolAttendancePage() {
  const { t, locale } = useTranslation();
  const today = localDateKey();
  const [date, setDate] = useState(today);
  const [openClass, setOpenClass] = useState<{ id: string; label: string } | null>(null);
  const day = useSchoolDayAttendance(date);
  const isToday = date === today;
  const dateLabel = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));
  const absent = day.data ? day.data.totalCount - day.data.presentCount : 0;
  const arrow = "flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title={t("attendance.title")}
        subtitle={t("register.subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!isToday && <Button variant="secondary" onClick={() => setDate(today)}>{t("register.today")}</Button>}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              <button type="button" aria-label={t("register.previousDay")} onClick={() => setDate((d) => shiftDay(d, -1))} className={arrow}>
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <label className="sr-only" htmlFor="attendance-date">{t("common.date")}</label>
              <input
                id="attendance-date"
                type="date"
                value={date}
                max={today}
                onChange={(e) => e.target.value && e.target.value <= today && setDate(e.target.value)}
                className="h-10 rounded-lg border-0 bg-transparent px-2 text-sm font-extrabold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-slate-50 dark:[color-scheme:dark]"
              />
              <button type="button" aria-label={t("register.nextDay")} disabled={isToday} onClick={() => setDate((d) => shiftDay(d, 1))} className={arrow}>
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        }
      />
      <p aria-live="polite" className="-mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">{dateLabel}</p>

      {day.isError ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{t("register.loadError")}</p>
          <Button variant="secondary" onClick={() => void day.refetch()}>{t("common.retry")}</Button>
        </Card>
      ) : !day.data ? (
        <div className="flex flex-col gap-4" aria-busy>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[7.25rem] rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label={t("register.presentToday")}
              value={day.data.attendanceRate === null ? "–" : `${Math.round(day.data.attendanceRate)}%`}
              hint={day.data.attendanceRate === null ? t("register.notTakenYet") : t("register.presentHint", { present: day.data.presentCount, total: day.data.totalCount })}
              tone={day.data.attendanceRate === null ? "neutral" : "success"}
            />
            <StatCard label={t("register.absentCount")} value={day.data.attendanceRate === null ? "–" : absent} tone={absent > 0 ? "warning" : "neutral"} hint={t("register.parentsTold")} />
            <StatCard
              label={t("register.registersMissing")}
              value={day.data.unmarkedClassCount}
              hint={day.data.unmarkedClassCount === 0 ? t("register.allTaken") : undefined}
              tone={day.data.unmarkedClassCount > 0 ? "danger" : "success"}
            />
          </div>

          <Card className="p-0">
            {day.data.classes.length === 0 ? (
              <div className="p-5"><EmptyState title={t("schoolAttendance.noClassesSetUp")} /></div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {day.data.classes.map((entry) => {
                  const label = classLabel(entry.name, entry.section);
                  return (
                    <li key={entry.classId} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                      <div className="w-24 shrink-0">
                        <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{label}</p>
                      </div>
                      <div className="min-w-[10rem] flex-1">
                        {entry.marked ? (
                          <>
                            <ProgressBar size="sm" value={entry.attendanceRate ?? 0} label={label} tone={(entry.attendanceRate ?? 0) >= 85 ? "brand" : "accent"} />
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              {t("attendance.presentOfTotal", { present: entry.presentCount, total: entry.totalCount })}
                            </p>
                          </>
                        ) : (
                          <Badge tone="danger">{t("register.notTaken")}</Badge>
                        )}
                      </div>
                      <span className="w-14 text-end text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-50">
                        {entry.attendanceRate === null ? "" : `${Math.round(entry.attendanceRate)}%`}
                      </span>
                      <Button variant={entry.marked ? "secondary" : "primary"} onClick={() => setOpenClass({ id: entry.classId, label })}>
                        {entry.marked ? t("register.open") : t("register.take")}
                        <span className="sr-only"> {label}</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      <RegisterPanel classId={openClass?.id ?? null} label={openClass?.label ?? ""} date={date} dateLabel={dateLabel} onClose={() => setOpenClass(null)} />
    </div>
  );
}
