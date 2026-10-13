"use client";

import { useMyTimetable, usePeriods } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { TEACHING_DAYS } from "@skolara/types";
import { Card, EmptyState, cn } from "@skolara/ui";
import { ListState, PageTitle } from "@/components/ui-kit";
import { WeekGrid, subjectColour } from "@/components/week-grid";
import { classLabel } from "../../school/home-helpers";

/** Every lesson a teacher has this week, with today's lessons listed first. */
export default function TeacherTimetablePage() {
  const { t } = useTranslation();
  const entries = useMyTimetable();
  const periods = usePeriods();
  const today = TEACHING_DAYS[(new Date().getDay() + 6) % 7];
  const todays = (entries.data ?? [])
    .filter((e) => e.dayOfWeek === today)
    .sort((a, b) => a.period.sortOrder - b.period.sortOrder);
  const loading = entries.isLoading || periods.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t("timetable.myTimetable")} subtitle={t("timetable.myTimetableDescription")} />
      {entries.isError || loading ? (
        <Card className="p-0"><ListState isError={entries.isError} isLoading={loading} onRetry={() => void entries.refetch()} errorText={t("timetable.loadError")} /></Card>
      ) : (entries.data ?? []).length === 0 ? (
        <Card><EmptyState title={t("timetable.noLessonsScheduled")} /></Card>
      ) : (
        <>
          <section aria-labelledby="today-lessons">
            <h2 id="today-lessons" className="mb-3 text-lg font-extrabold text-slate-900 dark:text-slate-50">{t("timetable.today")}</h2>
            {todays.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("timetable.noLessonsToday")}</p>
            ) : (
              <ol className="flex gap-3 overflow-x-auto pb-1">
                {todays.map((lesson) => (
                  <li key={lesson.id} className={cn("min-w-[11rem] rounded-2xl border p-3", subjectColour(lesson.subject))}>
                    <p className="text-xs font-bold tabular-nums opacity-80" dir="ltr">{lesson.period.startTime}–{lesson.period.endTime}</p>
                    <p className="mt-1 font-extrabold">{lesson.subject}</p>
                    <p className="text-sm opacity-80">
                      {classLabel(lesson.class.name, lesson.class.section ?? null)}
                      {lesson.room ? ` · ${t("timetable.roomShort", { room: lesson.room })}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <Card className="p-3">
            <WeekGrid
              label={t("timetable.myTimetable")}
              periods={periods.data ?? []}
              cell={(day, period) => {
                const lesson = entries.data?.find((e) => e.dayOfWeek === day && e.periodId === period.id);
                return lesson ? (
                  <div className={cn("flex h-full flex-col rounded-xl border p-2", subjectColour(lesson.subject))}>
                    <span className="truncate font-extrabold">{lesson.subject}</span>
                    <span className="truncate text-xs opacity-80">
                      {classLabel(lesson.class.name, lesson.class.section ?? null)}
                      {lesson.room ? ` · ${lesson.room}` : ""}
                    </span>
                  </div>
                ) : (
                  <div className="h-full rounded-xl bg-slate-50 dark:bg-slate-800/40" />
                );
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
