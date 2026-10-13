"use client";

import { ApiError, useClassGrades, useSaveMarkSheet, useStudentsByClass } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { Exam } from "@skolara/types";
import { Button, Input, cn } from "@skolara/ui";
import { useMemo, useState } from "react";
import { Field, ListState } from "@/components/ui-kit";

/** A typed mark: a number from 0 to `max` with at most 2 decimals, or null. */
export function parseMark(raw: string, max: number): number | null {
  const text = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const value = Number(text);
  return value <= max ? value : null;
}

/** One subject's marks for the whole class, saved together. */
export function MarkSheet({ exam }: { exam: Exam }) {
  const { t } = useTranslation();
  const students = useStudentsByClass(exam.classId);
  const grades = useClassGrades(exam.classId, exam.term);
  const save = useSaveMarkSheet();
  const [subject, setSubject] = useState("");
  const [maxRaw, setMaxRaw] = useState("100");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const subjectKey = subject.trim().toLowerCase();
  const known = useMemo(() => {
    const names = new Set<string>();
    for (const g of grades.data ?? []) if (g.examType === exam.examType) names.add(g.subject);
    return [...names].sort();
  }, [grades.data, exam.examType]);
  const existing = useMemo(() => {
    const map = new Map<string, { marks: number; max: number }>();
    for (const g of grades.data ?? []) {
      if (g.examType === exam.examType && g.subject.trim().toLowerCase() === subjectKey) {
        map.set(g.studentId, { marks: Number(g.marksObtained), max: Number(g.maxMarks) });
      }
    }
    return map;
  }, [grades.data, exam.examType, subjectKey]);

  if (students.isError || grades.isError || !students.data || !grades.data) {
    const forbidden = [students.error, grades.error].some((e) => e instanceof ApiError && e.status === 403);
    return (
      <ListState
        isError={students.isError || grades.isError}
        isLoading
        onRetry={() => {
          void students.refetch();
          void grades.refetch();
        }}
        errorText={forbidden ? t("examResults.notAllowed") : t("examResults.loadError")}
      />
    );
  }

  const max = parseMark(maxRaw, 9999.99);
  const valueFor = (id: string) => drafts[id] ?? (existing.has(id) ? String(existing.get(id)?.marks) : "");
  const rows = students.data.map((s) => {
    const raw = valueFor(s.id).trim();
    return { student: s, raw, mark: raw === "" || max === null ? null : parseMark(raw, max) };
  });
  const invalid = max === null || max <= 0 || rows.some((r) => r.raw !== "" && r.mark === null);
  const filled = rows.filter((r) => r.mark !== null).length;

  function submit() {
    setMessage(null);
    if (invalid || max === null) {
      setMessage({ tone: "error", text: t("examResults.marksInvalid", { max: max ?? maxRaw }) });
      return;
    }
    const entries = rows.filter((r): r is typeof r & { mark: number } => r.mark !== null).map((r) => ({ studentId: r.student.id, marksObtained: r.mark }));
    if (entries.length === 0) {
      setMessage({ tone: "error", text: t("examResults.nothingToSave") });
      return;
    }
    // Reuse the spelling already on record so "maths" and "Maths" stay one subject.
    const canonical = known.find((name) => name.trim().toLowerCase() === subjectKey) ?? subject.trim();
    save.mutate(
      { classId: exam.classId, subject: canonical, term: exam.term, examType: exam.examType, maxMarks: max, entries },
      {
        onSuccess: (result) => {
          setDrafts({});
          setMessage({ tone: "ok", text: t("examResults.marksSaved", { count: result.saved }) });
        },
        onError: (error) =>
          setMessage({ tone: "error", text: error instanceof ApiError && error.status === 403 ? t("examResults.notAllowed") : t("common.somethingWentWrong") }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("examResults.subject")} className="min-w-[12rem] flex-1">
          {(props) => (
            <>
              <Input
                {...props}
                list="known-subjects"
                maxLength={60}
                autoComplete="off"
                placeholder={t("examResults.subjectPlaceholder")}
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setDrafts({});
                  setMessage(null);
                }}
              />
              <datalist id="known-subjects">{known.map((name) => <option key={name} value={name} />)}</datalist>
            </>
          )}
        </Field>
        <Field label={t("examResults.maxMarks")} className="w-28">
          {(props) => <Input {...props} inputMode="decimal" autoComplete="off" value={maxRaw} onChange={(e) => setMaxRaw(e.target.value)} className="text-end tabular-nums" />}
        </Field>
      </div>
      {known.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {known.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={name.trim().toLowerCase() === subjectKey}
              onClick={() => {
                setSubject(name);
                setDrafts({});
                setMessage(null);
                const sample = (grades.data ?? []).find((g) => g.subject === name && g.examType === exam.examType);
                if (sample) setMaxRaw(String(Number(sample.maxMarks)));
              }}
              className={cn(
                "min-h-[2.25rem] rounded-full border px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700",
                name.trim().toLowerCase() === subjectKey
                  ? "border-brand-700 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-100"
                  : "border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {!subjectKey ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">{t("examResults.enterSubject")}</p>
      ) : students.data.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">{t("register.noStudents")}</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(({ student, raw, mark }) => {
              const name = `${student.user.firstName} ${student.user.lastName}`;
              const bad = raw !== "" && mark === null;
              return (
                <li key={student.id} className="flex items-center gap-3 py-2">
                  <label htmlFor={`mark-${student.id}`} className="min-w-0 flex-1">
                    <span className="sr-only">{t("examResults.marksFor", { name })}</span>
                    <span aria-hidden className="block truncate text-sm font-bold text-slate-900 dark:text-slate-50">{name}</span>
                    <span aria-hidden className="block text-xs text-slate-600 dark:text-slate-400">{student.admissionNumber}</span>
                  </label>
                  <Input
                    id={`mark-${student.id}`}
                    inputMode="decimal"
                    autoComplete="off"
                    aria-invalid={bad || undefined}
                    value={valueFor(student.id)}
                    onChange={(e) => setDrafts((d) => ({ ...d, [student.id]: e.target.value }))}
                    className={cn("w-24 text-end tabular-nums", bad && "border-red-600 focus:border-red-600")}
                  />
                  <span aria-hidden className="w-14 text-sm tabular-nums text-slate-600 dark:text-slate-400">/ {max ?? "–"}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{t("examResults.filled", { filled, total: rows.length })}</p>
            <div className="flex flex-wrap items-center gap-3">
              <p role="status" aria-live="polite" className={cn("text-sm font-bold", message?.tone === "error" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                {message?.text}
              </p>
              <Button disabled={save.isPending} onClick={submit}>{save.isPending ? t("common.saving") : t("examResults.saveMarks")}</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
