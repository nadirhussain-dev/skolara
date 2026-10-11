"use client";

import { useClassExams, useClasses, useCreateExam } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { Exam } from "@skolara/types";
import { Button, Card, CardTitle, EmptyState, Input, Select, cn } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { Field, ListState, PageTitle, SidePanel } from "@/components/ui-kit";
import { intlLocale } from "@/lib/intl";
import { classLabel } from "../home-helpers";
import { MarkSheet } from "./mark-sheet";
import { Ranking } from "./ranking";

function ScheduleForm({ classId, onDone }: { classId: string; onDone: (exam: Exam) => void }) {
  const { t } = useTranslation();
  const create = useCreateExam();
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [examType, setExamType] = useState("");
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = t("people.required");
    if (!term.trim()) found.term = t("people.required");
    if (!examType.trim()) found.examType = t("people.required");
    const when = date ? new Date(`${date}T00:00:00.000Z`) : null;
    if (!when || Number.isNaN(when.getTime())) found.date = t("people.required");
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0 || !when) return;
    create.mutate(
      { classId, name: name.trim(), term: term.trim(), examType: examType.trim(), scheduledDate: when },
      { onSuccess: onDone, onError: () => setFailure(t("common.somethingWentWrong")) },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label={t("examResults.examName")} help={t("examResults.examNameHelp")} error={errors.name}>
        {(props) => <Input {...props} maxLength={80} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label={t("examResults.term")} help={t("examResults.termHelp")} error={errors.term}>
        {(props) => <Input {...props} maxLength={60} autoComplete="off" value={term} onChange={(e) => setTerm(e.target.value)} />}
      </Field>
      <Field label={t("examResults.examType")} help={t("examResults.examTypeHelp")} error={errors.examType}>
        {(props) => <Input {...props} maxLength={60} autoComplete="off" value={examType} onChange={(e) => setExamType(e.target.value)} />}
      </Field>
      <Field label={t("examResults.date")} error={errors.date}>
        {(props) => <Input {...props} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
      </Field>
      {failure && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{failure}</p>}
      <Button type="submit" disabled={create.isPending}>{create.isPending ? t("exams.scheduling") : t("examResults.schedule")}</Button>
    </form>
  );
}

/**
 * Exams and results for one class at a time. School admins see every class;
 * a teacher sees only the classes they are assigned to, because that is all
 * the API returns for them.
 */
export default function ExamsPage() {
  const { t, locale } = useTranslation();
  const classes = useClasses();
  const [classId, setClassId] = useState("");
  const exams = useClassExams(classId);
  const [examId, setExamId] = useState<string | null>(null);
  const [tab, setTab] = useState<"marks" | "ranking">("marks");
  const [scheduling, setScheduling] = useState(false);
  const exam = exams.data?.find((e) => e.id === examId) ?? null;
  const dateFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title={t("examResults.title")}
        subtitle={t("examResults.subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label={t("examResults.chooseClass")}
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setExamId(null);
              }}
              className="w-44"
            >
              <option value="">{t("fields.selectClass")}</option>
              {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>)}
            </Select>
            <Button disabled={!classId} onClick={() => setScheduling(true)}>{t("examResults.schedule")}</Button>
          </div>
        }
      />

      {classes.data && classes.data.length === 0 ? (
        <Card><EmptyState title={t("examResults.noAssignedClasses")} description={t("examResults.noAssignedClassesBody")} /></Card>
      ) : !classId ? (
        <Card><p className="py-8 text-center text-sm text-slate-600 dark:text-slate-400">{t("examResults.pickClass")}</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="self-start p-0">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><CardTitle>{t("examResults.exams")}</CardTitle></div>
            {exams.isError || !exams.data ? (
              <ListState isError={exams.isError} isLoading={!exams.data} onRetry={() => void exams.refetch()} errorText={t("examResults.loadError")} rows={3} />
            ) : exams.data.length === 0 ? (
              <div className="p-4"><EmptyState title={t("examResults.noExamsTitle")} description={t("examResults.noExamsBody")} /></div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {exams.data.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      aria-current={e.id === examId ? "true" : undefined}
                      onClick={() => setExamId(e.id)}
                      className={cn(
                        "block w-full px-4 py-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-700",
                        e.id === examId ? "bg-brand-50 shadow-[inset_3px_0_0_rgb(var(--brand-700))] dark:bg-brand-900/30 rtl:shadow-[inset_-3px_0_0_rgb(var(--brand-700))]" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      )}
                    >
                      <span className="block font-extrabold text-slate-900 dark:text-slate-50">{e.name}</span>
                      <span className="block text-sm text-slate-600 dark:text-slate-400">
                        {e.term} · {e.examType} · {dateFormat.format(new Date(e.scheduledDate))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="lg:col-span-2">
            {!exam ? (
              <Card><p className="py-8 text-center text-sm text-slate-600 dark:text-slate-400">{t("examResults.selectExam")}</p></Card>
            ) : (
              <Card className="p-0">
                <div role="tablist" aria-label={exam.name} className="flex gap-1 border-b border-slate-200 px-3 dark:border-slate-800">
                  {(["marks", "ranking"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={tab === key}
                      onClick={() => setTab(key)}
                      className={cn(
                        "-mb-px flex h-12 items-center border-b-[3px] px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700",
                        tab === key ? "border-brand-700 text-brand-800 dark:border-brand-300 dark:text-brand-200" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400",
                      )}
                    >
                      {t(key === "marks" ? "examResults.tabMarks" : "examResults.tabRanking")}
                    </button>
                  ))}
                </div>
                <div className="p-4 sm:p-5">
                  {tab === "marks" ? <MarkSheet key={exam.id} exam={exam} /> : <Ranking examId={exam.id} />}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      <SidePanel open={scheduling} title={t("examResults.scheduleTitle")} onClose={() => setScheduling(false)}>
        {classId && (
          <ScheduleForm
            classId={classId}
            onDone={(created) => {
              setScheduling(false);
              setExamId(created.id);
              setTab("marks");
            }}
          />
        )}
      </SidePanel>
    </div>
  );
}
