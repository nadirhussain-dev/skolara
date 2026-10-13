"use client";

import {
  useAssignmentSubmissions,
  useClassAssignments,
  useClasses,
  useCreateAssignment,
  useGradeAssignment,
  useStudents,
  type AssignmentWithProgress,
} from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Badge, Button, Card, EmptyState, Input, ProgressBar, Select, Textarea, cn } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { Avatar, Field, FilterTabs, ListState, PageTitle, SidePanel } from "@/components/ui-kit";
import { subjectColour } from "@/components/week-grid";
import { intlLocale } from "@/lib/intl";
import { safeHttpUrl } from "@/lib/safe-url";
import { classLabel } from "../home-helpers";

const DAY = 864e5;
const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Whole days from today to the due date: 0 is today, negative is overdue. */
function daysUntil(due: Date | string): number {
  const d = new Date(due);
  const today = new Date();
  return Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY);
}

/**
 * Homework for one class at a time: what is due, how many have handed it in,
 * and the work itself to mark. Setting homework tells every pupil and parent
 * in the class through the app.
 */
export default function HomeworkPage() {
  const { t, locale } = useTranslation();
  const classes = useClasses();
  const [picked, setPicked] = useState<string | null>(null);
  const classId = picked ?? classes.data?.[0]?.id ?? "";
  const homework = useClassAssignments(classId);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<AssignmentWithProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formatDue = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", day: "numeric", month: "short" });

  const list = homework.data ?? [];
  const current = list.filter((a) => daysUntil(a.dueDate) >= 0).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  const past = list.filter((a) => daysUntil(a.dueDate) < 0);

  const dueLabel = (due: Date | string) => {
    const days = daysUntil(due);
    if (days === 0) return { text: t("homework.dueToday"), tone: "warning" as const };
    if (days === 1) return { text: t("homework.dueTomorrow"), tone: "info" as const };
    if (days < 0) return { text: t("homework.closedOn", { date: formatDue.format(new Date(due)) }), tone: "neutral" as const };
    return { text: t("homework.dueOn", { date: formatDue.format(new Date(due)) }), tone: "info" as const };
  };

  const row = (a: AssignmentWithProgress) => {
    const due = dueLabel(a.dueDate);
    const share = a.classSize > 0 ? Math.round((a.submittedCount / a.classSize) * 100) : 0;
    return (
      <li key={a.id}>
        <button
          type="button"
          onClick={() => setOpen(a)}
          className="grid w-full grid-cols-1 items-center gap-3 px-5 py-4 text-start transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-700 sm:grid-cols-[minmax(0,1fr)_14rem] dark:hover:bg-slate-800/60"
        >
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-md border px-2 py-0.5 text-xs font-bold", subjectColour(a.subject))}>{a.subject}</span>
              <Badge tone={due.tone}>{due.text}</Badge>
            </span>
            <span className="mt-1 block truncate font-extrabold text-slate-900 dark:text-slate-50">{a.title}</span>
            {a.description && <span className="block truncate text-sm text-slate-600 dark:text-slate-400">{a.description}</span>}
          </span>
          <span className="flex flex-col gap-1">
            <span className="flex justify-between text-sm">
              <span className="font-bold text-slate-900 dark:text-slate-50">{t("homework.handedIn", { count: a.submittedCount, total: a.classSize })}</span>
              <span className="tabular-nums text-slate-600 dark:text-slate-400">{share}%</span>
            </span>
            <ProgressBar value={share} label={t("homework.handedIn", { count: a.submittedCount, total: a.classSize })} />
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={t("homework.title")}
        subtitle={t("homework.subtitle")}
        action={<Button disabled={!classId} onClick={() => { setAdding(true); setNotice(null); }}>{t("homework.set")}</Button>}
      />
      {(classes.data ?? []).length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterTabs label={t("homework.chooseClass")} value={classId} onChange={setPicked} options={(classes.data ?? []).map((c) => ({ value: c.id, label: classLabel(c.name, c.section ?? null) }))} />
          <p role="status" aria-live="polite" className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{notice}</p>
        </div>
      )}

      {classes.isLoading || homework.isLoading || homework.isError ? (
        <Card className="p-0"><ListState isError={homework.isError} isLoading={!homework.isError} onRetry={() => void homework.refetch()} errorText={t("homework.loadError")} /></Card>
      ) : !classId ? (
        <Card><EmptyState title={t("homework.noClasses")} description={t("homework.noClassesBody")} /></Card>
      ) : list.length === 0 ? (
        <Card><EmptyState title={t("homework.noneYet")} description={t("homework.noneYetBody")} /></Card>
      ) : (
        <>
          <Card className="p-0">
            <h2 className="px-5 pt-4 text-lg font-extrabold text-slate-900 dark:text-slate-50">{t("homework.current")}</h2>
            {current.length === 0 ? (
              <p className="px-5 pb-5 pt-2 text-sm text-slate-600 dark:text-slate-400">{t("homework.nothingDue")}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">{current.map(row)}</ul>
            )}
          </Card>
          {past.length > 0 && (
            <Card className="p-0">
              <h2 className="px-5 pt-4 text-lg font-extrabold text-slate-900 dark:text-slate-50">{t("homework.past")}</h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">{past.map(row)}</ul>
            </Card>
          )}
        </>
      )}

      <SidePanel open={adding} title={t("homework.set")} onClose={() => setAdding(false)}>
        {adding && (
          <HomeworkForm
            classId={classId}
            subjects={[...new Set(list.map((a) => a.subject))]}
            onDone={(title) => {
              setAdding(false);
              setNotice(t("homework.sent", { title }));
            }}
          />
        )}
      </SidePanel>

      <SidePanel open={open !== null} title={open?.title ?? ""} onClose={() => setOpen(null)}>
        {open && <Submissions homework={open} classId={classId} />}
      </SidePanel>
    </div>
  );
}

function HomeworkForm({ classId: initialClass, subjects, onDone }: { classId: string; subjects: string[]; onDone: (title: string) => void }) {
  const { t } = useTranslation();
  const classes = useClasses();
  const create = useCreateAssignment();
  const [classId, setClassId] = useState(initialClass);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState(() => isoDay(new Date(Date.now() + 2 * DAY)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!subject.trim()) found.subject = t("homework.subjectRequired");
    if (!title.trim()) found.title = t("homework.titleRequired");
    if (!due) found.due = t("homework.dueRequired");
    else if (due < isoDay(new Date())) found.due = t("homework.dueInPast");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    create.mutate(
      // End of the chosen day, so "due Thursday" still counts on Thursday evening.
      { classId, subject: subject.trim(), title: title.trim(), description: description.trim() || undefined, dueDate: new Date(`${due}T23:59:00`) },
      { onSuccess: () => onDone(title.trim()), onError: (e) => setErrors({ form: e instanceof Error ? e.message : t("common.somethingWentWrong") }) },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label={t("homework.class")}>
        {(props) => (
          <Select {...props} value={classId} onChange={(e) => setClassId(e.target.value)}>
            {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t("fields.subject")} error={errors.subject}>
        {(props) => (
          <>
            <Input {...props} list="homework-subjects" maxLength={60} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("homework.subjectPlaceholder")} />
            <datalist id="homework-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          </>
        )}
      </Field>
      <Field label={t("homework.what")} error={errors.title}>
        {(props) => <Input {...props} maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("homework.whatPlaceholder")} />}
      </Field>
      <Field label={t("homework.instructions")} optional>
        {(props) => <Textarea {...props} rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />}
      </Field>
      <Field label={t("homework.due")} error={errors.due}>
        {(props) => <Input {...props} type="date" min={isoDay(new Date())} value={due} onChange={(e) => setDue(e.target.value)} />}
      </Field>
      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">{t("homework.deliveryNote")}</p>
      {errors.form && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{errors.form}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending}>{create.isPending ? t("homework.sending") : t("homework.send")}</Button>
        <Button type="button" variant="ghost" onClick={() => onDone("")}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}

function Submissions({ homework, classId }: { homework: AssignmentWithProgress; classId: string }) {
  const { t, locale } = useTranslation();
  const submissions = useAssignmentSubmissions(homework.id);
  const roster = useStudents(classId);
  const formatTime = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const handedIn = new Set((submissions.data ?? []).map((s) => s.student.id));
  const missing = (roster.data ?? []).filter((s) => !handedIn.has(s.id));

  return (
    <div className="flex flex-col gap-5">
      {homework.description && <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{homework.description}</p>}
      <section>
        <h3 className="mb-2 font-extrabold text-slate-900 dark:text-slate-50">{t("homework.handedIn", { count: submissions.data?.length ?? 0, total: homework.classSize })}</h3>
        {submissions.isLoading || submissions.isError ? (
          <ListState isError={submissions.isError} isLoading={submissions.isLoading} onRetry={() => void submissions.refetch()} errorText={t("homework.loadError")} rows={2} />
        ) : (submissions.data ?? []).length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("assignments.noSubmissions")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {(submissions.data ?? []).map((s) => {
              const name = `${s.student.user.firstName} ${s.student.user.lastName}`;
              const late = new Date(s.submittedAt) > new Date(homework.dueDate);
              const link = safeHttpUrl(s.fileUrl);
              return (
                <li key={s.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Avatar name={name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900 dark:text-slate-50">{name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{formatTime.format(new Date(s.submittedAt))}{late ? ` · ${t("homework.late")}` : ""}</p>
                    </div>
                    {link && <a href={link} target="_blank" rel="noreferrer noopener" className="text-sm font-bold text-brand-700 underline dark:text-brand-300">{t("homework.openWork")}</a>}
                  </div>
                  {s.note && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">“{s.note}”</p>}
                  <MarkForm submissionId={s.id} grade={s.grade} feedback={s.feedback} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {missing.length > 0 && (
        <section>
          <h3 className="mb-2 font-extrabold text-slate-900 dark:text-slate-50">{t("homework.notYet", { count: missing.length })}</h3>
          <ul className="flex flex-wrap gap-2">
            {missing.map((s) => (
              <li key={s.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">{s.user.firstName} {s.user.lastName}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MarkForm({ submissionId, grade, feedback }: { submissionId: string; grade: string | null; feedback: string | null }) {
  const { t } = useTranslation();
  const mark = useGradeAssignment();
  const [value, setValue] = useState(grade ?? "");
  const [note, setNote] = useState(feedback ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        setSaved(false);
        mark.mutate({ submissionId, input: { grade: value.trim(), feedback: note.trim() || undefined } }, { onSuccess: () => setSaved(true) });
      }}
      className="mt-3 grid grid-cols-[6rem_minmax(0,1fr)] gap-2"
    >
      <Field label={t("homework.mark")}>{(props) => <Input {...props} maxLength={20} value={value} onChange={(e) => setValue(e.target.value)} placeholder="A" />}</Field>
      <Field label={t("homework.feedback")} optional>{(props) => <Input {...props} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      <div className="col-span-2 flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={mark.isPending || !value.trim()}>{grade ? t("homework.updateMark") : t("homework.saveMark")}</Button>
        <span role="status" className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{saved ? t("homework.markSent") : ""}</span>
      </div>
    </form>
  );
}
