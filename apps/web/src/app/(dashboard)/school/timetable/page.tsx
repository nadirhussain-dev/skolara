"use client";

import {
  useClassTimetable,
  useCreatePeriod,
  useDeletePeriod,
  useDeleteTimetableEntry,
  usePeriods,
  useUpsertTimetableEntry,
  useTeachers,
  ApiError,
} from "@skolara/api-client";
import { TEACHING_DAYS, type DayOfWeek, type TimetableConflict } from "@skolara/types";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
} from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { useState } from "react";

interface EditingSlot {
  dayOfWeek: DayOfWeek;
  periodId: string;
}

export default function TimetablePage() {
  const { t } = useTranslation();
  const api = useApiClient();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });
  const { data: teachers } = useTeachers();
  const { data: periods, isLoading: periodsLoading } = usePeriods();

  const [classId, setClassId] = useState<string>();
  const selectedClass = classes?.find((c) => c.id === classId);
  const { data: entries } = useClassTimetable(classId);

  const upsertEntry = useUpsertTimetableEntry();
  const deleteEntry = useDeleteTimetableEntry();

  const [editing, setEditing] = useState<EditingSlot | null>(null);
  const [subject, setSubject] = useState("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [room, setRoom] = useState("");
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);

  function entryAt(dayOfWeek: DayOfWeek, periodId: string) {
    return entries?.find((e) => e.dayOfWeek === dayOfWeek && e.periodId === periodId);
  }

  function openSlot(dayOfWeek: DayOfWeek, periodId: string) {
    const existing = entryAt(dayOfWeek, periodId);
    setEditing({ dayOfWeek, periodId });
    setSubject(existing?.subject ?? "");
    setTeacherUserId(existing?.teacherUserId ?? "");
    setRoom(existing?.room ?? "");
    setConflicts([]);
  }

  async function saveSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !classId) return;
    setConflicts([]);
    try {
      await upsertEntry.mutateAsync({
        classId,
        periodId: editing.periodId,
        dayOfWeek: editing.dayOfWeek,
        subject,
        teacherUserId,
        room: room || undefined,
      });
      setEditing(null);
    } catch (error) {
      // The API names what already occupies the slot, so show that rather
      // than a generic failure.
      if (error instanceof ApiError) {
        const details = error.details as { conflicts?: TimetableConflict[] } | undefined;
        setConflicts(details?.conflicts ?? [{ kind: "CLASS", message: error.message, conflictsWith: { id: "", classId: "", subject: "", teacherUserId: "", room: null } }]);
        return;
      }
      throw error;
    }
  }

  async function clearSlot() {
    if (!editing || !classId) return;
    const existing = entryAt(editing.dayOfWeek, editing.periodId);
    if (existing) await deleteEntry.mutateAsync(existing.id);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("timetable.title")}
        description={t("timetable.description")}
      />

      <PeriodEditor />

      <Card>
        <CardHeader>
          <CardTitle>{t("timetable.weeklyGrid")}</CardTitle>
        </CardHeader>

        <label className="flex max-w-xs flex-col gap-1 text-sm">
          {t("reportCards.class")}
          <select
            value={classId ?? ""}
            onChange={(e) => setClassId(e.target.value || undefined)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">{t("timetable.selectAClass")}</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section}
              </option>
            ))}
          </select>
        </label>

        {periodsLoading && <p className="mt-4 text-sm text-slate-500">{t("common.loading")}</p>}

        {!periodsLoading && periods?.length === 0 && (
          <div className="mt-4">
            <EmptyState title={t("timetable.addPeriodsFirst")} />
          </div>
        )}

        {classId && periods && periods.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 p-2 text-left font-medium text-slate-500 dark:border-slate-800">
                    {t("timetable.period")}
                  </th>
                  {TEACHING_DAYS.map((day) => (
                    <th
                      key={day}
                      className="border-b border-slate-200 p-2 text-left font-medium text-slate-500 dark:border-slate-800"
                    >
                      {t(`days.short.${day}`)}
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
                      const entry = entryAt(day, period.id);
                      return (
                        <td
                          key={day}
                          className="border-b border-slate-100 p-1 align-top dark:border-slate-800"
                        >
                          <button
                            type="button"
                            onClick={() => openSlot(day, period.id)}
                            className="w-full rounded-md border border-transparent p-2 text-left transition hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-slate-800"
                          >
                            {entry ? (
                              <>
                                <span className="block font-medium">{entry.subject}</span>
                                <span className="block text-xs text-slate-500">
                                  {entry.teacherUser.firstName} {entry.teacherUser.lastName}
                                  {entry.room ? ` · ${entry.room}` : ""}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400">{t("timetable.addSlot")}</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedClass?.name} {selectedClass?.section} ·{" "}
              {t(`days.short.${editing.dayOfWeek}`)} ·{" "}
              {periods?.find((p) => p.id === editing.periodId)?.name}
            </CardTitle>
          </CardHeader>
          <form onSubmit={saveSlot} className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder={t("fields.subject")}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <select
                value={teacherUserId}
                onChange={(e) => setTeacherUserId(e.target.value)}
                required
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">{t("timetable.teacherPlaceholder")}</option>
                {teachers?.map((t) => (
                  <option key={t.userId} value={t.userId}>
                    {t.user.firstName} {t.user.lastName}
                  </option>
                ))}
              </select>
              <Input
                placeholder={t("timetable.roomOptional")}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            {conflicts.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {conflicts.map((conflict, i) => (
                  <li key={i}>{conflict.message}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={upsertEntry.isPending}>
                {upsertEntry.isPending ? t("common.saving") : t("timetable.saveLesson")}
              </Button>
              {entryAt(editing.dayOfWeek, editing.periodId) && (
                <Button type="button" variant="secondary" onClick={clearSlot}>
                  {t("timetable.clearSlot")}
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

function PeriodEditor() {
  const { t } = useTranslation();
  const { data: periods } = usePeriods();
  const createPeriod = useCreatePeriod();
  const deletePeriod = useDeletePeriod();

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createPeriod.mutateAsync({
      name,
      startTime,
      endTime,
      // Appended to the end of the day; explicit ordering lets a school slot a
      // break wherever it belongs rather than sorting on start time.
      sortOrder: periods?.length ?? 0,
    });
    setName("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("timetable.schoolDay")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <Input
          placeholder={t("timetable.periodNameHint")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          {t("timetable.starts")}
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          {t("timetable.ends")}
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </label>
        <Button type="submit" disabled={createPeriod.isPending}>
          {createPeriod.isPending ? t("timetable.addingPeriod") : t("timetable.addPeriod")}
        </Button>
      </form>

      {periods && periods.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {periods.map((period) => (
            <li
              key={period.id}
              className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-slate-800"
            >
              <span>{period.name}</span>
              <span className="tabular-nums text-xs text-slate-400">
                {period.startTime}–{period.endTime}
              </span>
              <button
                type="button"
                onClick={() => deletePeriod.mutate(period.id)}
                aria-label={t("timetable.removePeriod", { name: period.name })}
                className="text-slate-400 transition hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
