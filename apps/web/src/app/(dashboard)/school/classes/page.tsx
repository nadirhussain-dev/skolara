"use client";

import { ApiError, useClasses, useCreateClass, useStudents } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, EmptyState, Input, Skeleton } from "@skolara/ui";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Field, PageTitle, SidePanel } from "@/components/ui-kit";
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

export default function ClassesPage() {
  const { t } = useTranslation();
  const classes = useClasses();
  const students = useStudents();
  const [adding, setAdding] = useState(false);

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

      <SidePanel open={adding} title={t("people.addClassTitle")} onClose={() => setAdding(false)}>
        <AddClassForm onDone={() => setAdding(false)} />
      </SidePanel>
    </div>
  );
}
