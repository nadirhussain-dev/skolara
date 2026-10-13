"use client";

import { ApiError, useClassTeachers, useClasses, useCreateClass, useSetClassTeacher, useStudents, useTeachers } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, EmptyState, Input, Skeleton } from "@skolara/ui";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Field, ListState, PageTitle, SidePanel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth-context";
import { classLabel } from "../home-helpers";

/** "2026-2027" for a school year that starts in April. */
function defaultAcademicYear(now: Date = new Date()): string {
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

function AddClassForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const create = useCreateClass();
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [academicYear, setAcademicYear] = useState(() => defaultAcademicYear());
  const [errors, setErrors] = useState<{ name?: string; section?: string; academicYear?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = {};
    if (!name.trim()) found.name = t("people.required");
    if (!section.trim()) found.section = t("people.required");
    if (!academicYear.trim()) found.academicYear = t("people.required");
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0 || !user?.schoolId) return;
    create.mutate(
      { schoolId: user.schoolId, name: name.trim(), section: section.trim(), academicYear: academicYear.trim(), classTeacherId: null },
      {
        onSuccess: onDone,
        onError: (error) =>
          setFailure(error instanceof ApiError && error.status === 409 ? t("people.classExists") : t("common.somethingWentWrong")),
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label={t("people.className")} help={t("people.classNameHelp")} error={errors.name}>
        {(props) => <Input {...props} autoComplete="off" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label={t("fields.section")} help={t("people.sectionHelp")} error={errors.section}>
        {(props) => <Input {...props} autoComplete="off" maxLength={20} value={section} onChange={(e) => setSection(e.target.value)} />}
      </Field>
      <Field label={t("fields.academicYear")} error={errors.academicYear}>
        {(props) => <Input {...props} autoComplete="off" maxLength={20} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />}
      </Field>
      {failure && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{failure}</p>}
      <Button type="submit" disabled={create.isPending}>{create.isPending ? t("classes.creating") : t("people.addClass")}</Button>
    </form>
  );
}

/** Tick the teachers who may take this class's register and enter its marks. */
function ClassTeachers({ classId }: { classId: string }) {
  const { t } = useTranslation();
  const teachers = useTeachers();
  const assigned = useClassTeachers(classId);
  const setTeacher = useSetClassTeacher(classId);
  const [error, setError] = useState<string | null>(null);

  if (teachers.isError || assigned.isError || !teachers.data || !assigned.data) {
    return (
      <ListState
        isError={teachers.isError || assigned.isError}
        isLoading
        onRetry={() => {
          void teachers.refetch();
          void assigned.refetch();
        }}
        errorText={t("people.loadError")}
      />
    );
  }
  if (teachers.data.length === 0) {
    return <p className="py-6 text-sm text-slate-600 dark:text-slate-400">{t("examResults.noTeachersToAssign")}</p>;
  }
  const assignedIds = new Set(assigned.data.map((teacher) => teacher.id));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t("examResults.classTeachersIntro")}</p>
      <p aria-live="polite" className="text-sm font-bold text-slate-700 dark:text-slate-300">{t("examResults.assigned", { count: assignedIds.size })}</p>
      {error && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {teachers.data.map((teacher) => (
          <li key={teacher.id}>
            <label className="flex min-h-[3.25rem] cursor-pointer items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={assignedIds.has(teacher.userId)}
                disabled={setTeacher.isPending}
                onChange={(e) => {
                  setError(null);
                  setTeacher.mutate(
                    { teacherUserId: teacher.userId, assigned: e.target.checked },
                    { onError: () => setError(t("common.somethingWentWrong")) },
                  );
                }}
                className="h-5 w-5 rounded accent-[rgb(var(--brand-700))]"
              />
              <span className="min-w-0">
                <span className="block font-bold text-slate-900 dark:text-slate-50">{teacher.user.firstName} {teacher.user.lastName}</span>
                <span className="block truncate text-xs text-slate-600 dark:text-slate-400">{teacher.subjects.join(", ") || t("people.noSubjects")}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ClassesPage() {
  const { t } = useTranslation();
  const classes = useClasses();
  const students = useStudents();
  const [adding, setAdding] = useState(false);
  const [teachersFor, setTeachersFor] = useState<{ id: string; label: string } | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of students.data ?? []) if (s.classId) map.set(s.classId, (map.get(s.classId) ?? 0) + 1);
    return map;
  }, [students.data]);
  const sorted = useMemo(
    () => [...(classes.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }) || (a.section ?? "").localeCompare(b.section ?? "")),
    [classes.data],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title={t("classes.title")} subtitle={t("people.classesSubtitle")} action={<Button onClick={() => setAdding(true)}>{t("people.addClass")}</Button>} />

      {classes.isError ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{t("people.loadError")}</p>
          <Button variant="secondary" onClick={() => void classes.refetch()}>{t("common.retry")}</Button>
        </Card>
      ) : !classes.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy>
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <Card><EmptyState title={t("people.noClassesTitle")} description={t("people.noClassesBody")} /></Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((c) => {
            const count = counts.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Card className="flex h-full flex-col gap-3">
                  <div>
                    <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{classLabel(c.name, c.section ?? null)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {c.academicYear} · {students.data ? (count === 1 ? t("people.studentsInClassOne") : t("people.studentsInClass", { count })) : "…"}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href={`/school/students?class=${c.id}`} className="inline-flex min-h-[2.75rem] items-center rounded-lg bg-brand-50 px-3 text-sm font-extrabold text-brand-700 hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200">
                      {t("people.viewStudents")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setTeachersFor({ id: c.id, label: classLabel(c.name, c.section ?? null) })}
                      className="inline-flex min-h-[2.75rem] items-center rounded-lg px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {t("examResults.classTeachers")}
                    </button>
                    <Link href="/school/attendance" className="inline-flex min-h-[2.75rem] items-center rounded-lg px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                      {t("people.takeAttendance")}
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <SidePanel open={teachersFor !== null} title={t("examResults.classTeachersTitle", { name: teachersFor?.label ?? "" })} onClose={() => setTeachersFor(null)}>
        {teachersFor && <ClassTeachers key={teachersFor.id} classId={teachersFor.id} />}
      </SidePanel>

      <SidePanel open={adding} title={t("people.addClassTitle")} onClose={() => setAdding(false)}>
        <AddClassForm onDone={() => setAdding(false)} />
      </SidePanel>
    </div>
  );
}
