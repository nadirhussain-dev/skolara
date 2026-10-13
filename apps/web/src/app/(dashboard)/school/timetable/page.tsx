"use client";

import {
  ApiError,
  useClassTimetable,
  useClasses,
  useCreatePeriod,
  useDeletePeriod,
  useDeleteTimetableEntry,
  usePeriods,
  useTeachers,
  useUpsertTimetableEntry,
} from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { DayOfWeek, Period, TimetableConflict } from "@skolara/types";
import { Button, Card, EmptyState, Input, Select, cn } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { Field, FilterTabs, ListState, PageTitle, SidePanel } from "@/components/ui-kit";
import { WeekGrid, subjectColour } from "@/components/week-grid";
import { classLabel } from "../home-helpers";

interface Slot {
  day: DayOfWeek;
  period: Period;
}

/**
 * The weekly timetable, one class at a time. Click a lesson to change it or
 * an empty slot to fill it. A teacher or room already busy in that period is
 * refused with the clash named, never double-booked.
 */
export default function TimetablePage() {
  const { t } = useTranslation();
  const classes = useClasses();
  const periods = usePeriods();
  const [picked, setPicked] = useState<string | null>(null);
  const classId = picked ?? classes.data?.[0]?.id ?? null;
  const entries = useClassTimetable(classId ?? undefined);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [periodsOpen, setPeriodsOpen] = useState(false);
  const current = classes.data?.find((c) => c.id === classId);
  const entryAt = (day: DayOfWeek, periodId: string) => entries.data?.find((e) => e.dayOfWeek === day && e.periodId === periodId);
  const lessons = entries.data?.length ?? 0;
  const capacity = (periods.data?.length ?? 0) * 6;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={t("timetable.title")}
        subtitle={t("timetable.subtitle")}
        action={<Button variant="secondary" onClick={() => setPeriodsOpen(true)}>{t("timetable.editDay")}</Button>}
      />

      {classes.data && classes.data.length > 0 && (
        <FilterTabs
          label={t("timetable.chooseClass")}
          value={classId ?? ""}
          onChange={setPicked}
          options={classes.data.map((c) => ({ value: c.id, label: classLabel(c.name, c.section ?? null) }))}
        />
      )}

      <Card className="p-0">
        {periods.isError || periods.isLoading || classes.isLoading ? (
          <ListState isError={periods.isError} isLoading={!periods.isError} onRetry={() => void periods.refetch()} errorText={t("timetable.loadError")} />
        ) : (periods.data ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState title={t("timetable.noPeriodsTitle")} description={t("timetable.addPeriodsFirst")} />
            <div className="mt-2 flex justify-center"><Button onClick={() => setPeriodsOpen(true)}>{t("timetable.setUpDay")}</Button></div>
          </div>
        ) : !current ? (
          <div className="p-5"><EmptyState title={t("timetable.noClasses")} /></div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{t("timetable.classWeek", { name: classLabel(current.name, current.section ?? null) })}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("timetable.filled", { count: lessons, total: capacity })}</p>
            </div>
            <div className="p-3">
              <WeekGrid
                label={t("timetable.classWeek", { name: classLabel(current.name, current.section ?? null) })}
                periods={periods.data ?? []}
                cell={(day, period) => {
                  const entry = entryAt(day, period.id);
                  return (
                    <button
                      type="button"
                      onClick={() => setSlot({ day, period })}
                      aria-label={entry ? undefined : t("timetable.fillSlot", { day: t(`days.long.${day}`), period: period.name })}
                      className={cn(
                        "flex h-full w-full flex-col items-start rounded-xl border p-2 text-start transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700",
                        entry ? subjectColour(entry.subject) : "items-center justify-center border-dashed border-slate-200 text-slate-400 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:hover:bg-slate-800",
                      )}
                    >
                      {entry ? (
                        <>
                          <span className="w-full truncate font-extrabold">{entry.subject}</span>
                          <span className="w-full truncate text-xs opacity-80">{entry.teacherUser.firstName} {entry.teacherUser.lastName}</span>
                          {entry.room && <span className="w-full truncate text-xs opacity-80">{t("timetable.roomShort", { room: entry.room })}</span>}
                        </>
                      ) : (
                        <span aria-hidden className="text-lg leading-none">+</span>
                      )}
                    </button>
                  );
                }}
              />
            </div>
          </>
        )}
      </Card>

      <SidePanel
        open={slot !== null}
        title={slot ? t("timetable.slotTitle", { day: t(`days.long.${slot.day}`), period: slot.period.name }) : ""}
        onClose={() => setSlot(null)}
      >
        {slot && classId && (
          <LessonForm
            key={`${slot.day}-${slot.period.id}`}
            classId={classId}
            slot={slot}
            existing={entryAt(slot.day, slot.period.id)}
            subjects={[...new Set((entries.data ?? []).map((e) => e.subject))]}
            onDone={() => setSlot(null)}
          />
        )}
      </SidePanel>

      <SidePanel open={periodsOpen} title={t("timetable.schoolDay")} onClose={() => setPeriodsOpen(false)}>
        <PeriodEditor />
      </SidePanel>
    </div>
  );
}

function LessonForm({
  classId,
  slot,
  existing,
  subjects,
  onDone,
}: {
  classId: string;
  slot: Slot;
  existing: { id: string; subject: string; teacherUserId: string; room: string | null } | undefined;
  subjects: string[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const teachers = useTeachers();
  const upsert = useUpsertTimetableEntry();
  const remove = useDeleteTimetableEntry();
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [teacherUserId, setTeacherUserId] = useState(existing?.teacherUserId ?? "");
  const [room, setRoom] = useState(existing?.room ?? "");
  const [errors, setErrors] = useState<{ subject?: string; teacher?: string }>({});
  const [clashes, setClashes] = useState<string[]>([]);

  function save(event: FormEvent) {
    event.preventDefault();
    const found = { subject: subject.trim() ? undefined : t("timetable.subjectRequired"), teacher: teacherUserId ? undefined : t("timetable.teacherRequired") };
    setErrors(found);
    setClashes([]);
    if (found.subject || found.teacher) return;
    upsert.mutate(
      { classId, periodId: slot.period.id, dayOfWeek: slot.day, subject: subject.trim(), teacherUserId, room: room.trim() || undefined },
      {
        onSuccess: onDone,
        onError: (error) => {
          // The API names exactly what is already in that slot.
          const details = error instanceof ApiError ? (error.details as { conflicts?: TimetableConflict[] } | undefined) : undefined;
          setClashes(details?.conflicts?.map((c) => c.message) ?? [error instanceof Error ? error.message : t("common.somethingWentWrong")]);
        },
      },
    );
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400" dir="auto">{slot.period.startTime}–{slot.period.endTime}</p>
      <Field label={t("fields.subject")} error={errors.subject}>
        {(props) => (
          <>
            <Input {...props} list="timetable-subjects" maxLength={60} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("timetable.subjectPlaceholder")} />
            <datalist id="timetable-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          </>
        )}
      </Field>
      <Field label={t("timetable.teacher")} error={errors.teacher}>
        {(props) => (
          <Select {...props} value={teacherUserId} onChange={(e) => setTeacherUserId(e.target.value)}>
            <option value="">{t("timetable.teacherPlaceholder")}</option>
            {(teachers.data ?? []).map((teacher) => (
              <option key={teacher.userId} value={teacher.userId}>{teacher.user.firstName} {teacher.user.lastName}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("timetable.room")} optional>
        {(props) => <Input {...props} maxLength={30} value={room} onChange={(e) => setRoom(e.target.value)} />}
      </Field>
      {clashes.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <p className="font-bold">{t("timetable.clashTitle")}</p>
          <ul className="mt-1 list-disc ps-5">{clashes.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? t("common.saving") : t("timetable.saveLesson")}</Button>
        {existing && (
          <Button type="button" variant="secondary" disabled={remove.isPending} onClick={() => remove.mutate(existing.id, { onSuccess: onDone })}>
            {t("timetable.clearSlot")}
          </Button>
        )}
      </div>
    </form>
  );
}

function PeriodEditor() {
  const { t } = useTranslation();
  const periods = usePeriods();
  const create = useCreatePeriod();
  const remove = useDeletePeriod();
  const last = periods.data?.[periods.data.length - 1];
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  // The next period usually starts when the last one ends.
  const start = startTime || last?.endTime || "08:00";
  const end = endTime || addMinutes(start, 40);

  function add(event: FormEvent) {
    event.preventDefault();
    const label = name.trim() || t("timetable.periodN", { n: (periods.data?.length ?? 0) + 1 });
    if (start >= end) {
      setError(t("timetable.endAfterStart"));
      return;
    }
    setError(null);
    create.mutate(
      { name: label, startTime: start, endTime: end, sortOrder: periods.data?.length ?? 0 },
      {
        onSuccess: () => {
          setName("");
          setStartTime("");
          setEndTime("");
        },
        onError: (e) => setError(e instanceof Error ? e.message : t("common.somethingWentWrong")),
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t("timetable.schoolDayHelp")}</p>
      {confirming && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{t("timetable.removeWarning")}</p>}
      <ol className="flex flex-col gap-2">
        {(periods.data ?? []).map((period) => (
          <li key={period.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
            <span className="flex-1 font-bold text-slate-900 dark:text-slate-50">{period.name}</span>
            <span className="text-sm tabular-nums text-slate-600 dark:text-slate-400" dir="ltr">{period.startTime}–{period.endTime}</span>
            {confirming === period.id ? (
              <span className="flex items-center gap-1">
                <Button variant="ghost" onClick={() => setConfirming(null)}>{t("common.cancel")}</Button>
                {/* Removing a period takes every lesson in it with it, so it asks first. */}
                <Button onClick={() => remove.mutate(period.id, { onSuccess: () => setConfirming(null) })} disabled={remove.isPending}>
                  {t("timetable.confirmRemove")}
                </Button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(period.id)}
                aria-label={t("timetable.removePeriod", { name: period.name })}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ol>
      <form onSubmit={add} noValidate className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
        <Field label={t("timetable.periodName")} optional>
          {(props) => <Input {...props} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("timetable.periodN", { n: (periods.data?.length ?? 0) + 1 })} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("timetable.starts")}>{(props) => <Input {...props} type="time" value={start} onChange={(e) => setStartTime(e.target.value)} />}</Field>
          <Field label={t("timetable.ends")} error={error}>{(props) => <Input {...props} type="time" value={end} onChange={(e) => setEndTime(e.target.value)} />}</Field>
        </div>
        <div><Button type="submit" disabled={create.isPending}>{create.isPending ? t("timetable.addingPeriod") : t("timetable.addPeriod")}</Button></div>
      </form>
    </div>
  );
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, (h ?? 0) * 60 + (m ?? 0) + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
