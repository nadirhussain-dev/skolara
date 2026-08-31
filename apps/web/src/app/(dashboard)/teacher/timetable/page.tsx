"use client";

import { useMyTimetable, usePeriods } from "@skolara/api-client";
import { TEACHING_DAYS, type DayOfWeek } from "@skolara/types";
import { Card, CardHeader, CardTitle, EmptyState, PageHeader } from "@skolara/ui";

const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export default function TeacherTimetablePage() {
  const { data: entries, isLoading } = useMyTimetable();
  const { data: periods } = usePeriods();

  const hasLessons = (entries?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My timetable" description="Every lesson you teach this week." />

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {!isLoading && !hasLessons && (
        <EmptyState title="No lessons scheduled yet — your school admin builds the timetable." />
      )}

      {hasLessons && periods && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly schedule</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 p-2 text-left font-medium text-slate-500 dark:border-slate-800">
                    Period
                  </th>
                  {TEACHING_DAYS.map((day) => (
                    <th
                      key={day}
                      className="border-b border-slate-200 p-2 text-left font-medium text-slate-500 dark:border-slate-800"
                    >
                      {DAY_LABEL[day].slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id}>
                    <th className="border-b border-slate-100 p-2 text-left align-top font-medium dark:border-slate-800">
                      {period.name}
                      <span className="block text-xs font-normal tabular-nums text-slate-400">
                        {period.startTime}–{period.endTime}
                      </span>
                    </th>
                    {TEACHING_DAYS.map((day) => {
                      const entry = entries?.find(
                        (e) => e.dayOfWeek === day && e.periodId === period.id,
                      );
                      return (
                        <td
                          key={day}
                          className="border-b border-slate-100 p-2 align-top dark:border-slate-800"
                        >
                          {entry ? (
                            <>
                              <span className="block font-medium">{entry.subject}</span>
                              <span className="block text-xs text-slate-500">
                                {entry.class.name} {entry.class.section}
                                {entry.room ? ` · ${entry.room}` : ""}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-700">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
