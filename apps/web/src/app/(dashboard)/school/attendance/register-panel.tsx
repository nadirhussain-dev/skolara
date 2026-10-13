"use client";

import { useClassAttendance, useMarkAttendance, useStudentsByClass } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { StudentWithUser } from "@skolara/api-client";
import type { AttendanceRecord, AttendanceStatus } from "@skolara/types";
import { Button, cn } from "@skolara/ui";
import { useMemo, useState } from "react";
import { ListState, SidePanel } from "@/components/ui-kit";

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
const LABEL = {
  PRESENT: "attendance.present",
  ABSENT: "attendance.absent",
  LATE: "attendance.late",
  EXCUSED: "attendance.excused",
} as const;
const ON = {
  PRESENT: "bg-emerald-700 text-white border-emerald-700",
  ABSENT: "bg-red-700 text-white border-red-700",
  LATE: "bg-accent-500 text-[#1E1B4B] border-accent-500",
  EXCUSED: "bg-slate-700 text-white border-slate-700",
} as const;

function Register({ classId, date, onSaved }: { classId: string; date: string; onSaved: () => void }) {
  const { t } = useTranslation();
  const students = useStudentsByClass(classId);
  const saved = useClassAttendance(classId, date);

  if (students.isError || saved.isError || !students.data || !saved.data) {
    return (
      <ListState
        isError={students.isError || saved.isError}
        isLoading
        onRetry={() => {
          void students.refetch();
          void saved.refetch();
        }}
        errorText={t("register.loadError")}
        rows={8}
      />
    );
  }
  if (students.data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-400">{t("register.noStudents")}</p>;
  }
  return <RegisterForm classId={classId} date={date} students={students.data} saved={saved.data} onSaved={onSaved} />;
}

function RegisterForm({
  classId,
  date,
  students,
  saved,
  onSaved,
}: {
  classId: string;
  date: string;
  students: StudentWithUser[];
  saved: AttendanceRecord[];
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const mark = useMarkAttendance();
  // Start from what is already saved; anyone without a record starts present,
  // because on a normal day that is nearly everyone.
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(() => {
    const existing = new Map(saved.map((r) => [r.studentId, r.status]));
    return Object.fromEntries(students.map((s) => [s.id, existing.get(s.id) ?? "PRESENT"]));
  });
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const out = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const status of Object.values(marks)) out[status] += 1;
    return out;
  }, [marks]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {t("register.summary", { present: counts.PRESENT, absent: counts.ABSENT, late: counts.LATE, excused: counts.EXCUSED })}
        </p>
        <Button variant="ghost" onClick={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "PRESENT" as const])))}>
          {t("register.markAll")}
        </Button>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {students.map((student) => {
          const name = `${student.user.firstName} ${student.user.lastName}`;
          return (
            <li key={student.id} className="py-3">
              <fieldset>
                <legend className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                  <span className="sr-only">{t("register.statusFor", { name })}</span>
                  <span aria-hidden>{name}</span>
                  <span aria-hidden className="ms-2 text-xs font-medium text-slate-600 dark:text-slate-400">{student.admissionNumber}</span>
                </legend>
                <div className="grid grid-cols-4 gap-1.5">
                  {STATUSES.map((status) => (
                    <label
                      key={status}
                      className={cn(
                        "flex min-h-[2.75rem] cursor-pointer items-center justify-center rounded-lg border px-1 text-center text-xs font-extrabold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-brand-700",
                        marks[student.id] === status ? ON[status] : "border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300",
                      )}
                    >
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        className="sr-only"
                        checked={marks[student.id] === status}
                        onChange={() => setMarks((m) => ({ ...m, [student.id]: status }))}
                      />
                      {t(LABEL[status])}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-auto border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        {error && <p role="alert" className="mb-2 text-sm font-bold text-red-700 dark:text-red-400">{error}</p>}
        <Button
          className="w-full"
          disabled={mark.isPending}
          onClick={() => {
            setError(null);
            mark.mutate(
              {
                classId,
                date: new Date(`${date}T00:00:00.000Z`),
                markedOffline: false,
                entries: students.map((s) => ({ studentId: s.id, status: marks[s.id] ?? "PRESENT" })),
              },
              { onSuccess: onSaved, onError: () => setError(t("common.somethingWentWrong")) },
            );
          }}
        >
          {mark.isPending ? t("common.saving") : t("register.save")}
        </Button>
      </div>
    </div>
  );
}

export function RegisterPanel({
  classId,
  label,
  date,
  dateLabel,
  onClose,
}: {
  classId: string | null;
  label: string;
  date: string;
  dateLabel: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SidePanel open={classId !== null} title={t("register.registerFor", { name: label, date: dateLabel })} onClose={onClose}>
      {classId && <Register key={`${classId}-${date}`} classId={classId} date={date} onSaved={onClose} />}
    </SidePanel>
  );
}
