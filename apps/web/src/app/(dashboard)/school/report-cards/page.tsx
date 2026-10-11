"use client";

import { useClassGrades, useClasses, useGenerateClassReportCards, type GeneratedReportCard } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, CardTitle, EmptyState, Input, Select } from "@skolara/ui";
import { useMemo, useState, type FormEvent } from "react";
import { Avatar, Field, PageTitle } from "@/components/ui-kit";
import { classLabel } from "../home-helpers";

/** Only http(s) links are rendered; a stored URL of any other kind is ignored. */
function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function ReportCardsPage() {
  const { t } = useTranslation();
  const classes = useClasses();
  const generate = useGenerateClassReportCards();
  const [classId, setClassId] = useState("");
  const [term, setTerm] = useState("");
  const [cards, setCards] = useState<GeneratedReportCard[] | null>(null);
  const [errors, setErrors] = useState<{ classId?: string; term?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  // Terms that already have marks for this class, offered as one-tap choices.
  const grades = useClassGrades(classId);
  const terms = useMemo(() => [...new Set((grades.data ?? []).map((g) => g.term))].sort(), [grades.data]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = {};
    if (!classId) found.classId = t("people.required");
    if (!term.trim()) found.term = t("people.required");
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    setCards(null);
    generate.mutate(
      { classId, term: term.trim() },
      { onSuccess: setCards, onError: () => setFailure(t("reportCards.couldNotGenerate")) },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title={t("reportCards.title")} subtitle={t("reportCards.description")} />

      <Card>
        <CardTitle>{t("reportCards.generateForClass")}</CardTitle>
        <form onSubmit={submit} noValidate className="mt-4 flex flex-wrap items-start gap-4">
          <Field label={t("reportCards.class")} error={errors.classId} className="w-48">
            {(props) => (
              <Select {...props} value={classId} onChange={(e) => { setClassId(e.target.value); setCards(null); }}>
                <option value="">{t("fields.selectClass")}</option>
                {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>)}
              </Select>
            )}
          </Field>
          <Field label={t("fields.term")} help={t("reportCards.termHint")} error={errors.term} className="min-w-[12rem] flex-1 sm:max-w-xs">
            {(props) => (
              <>
                <Input {...props} list="report-terms" maxLength={60} autoComplete="off" value={term} onChange={(e) => setTerm(e.target.value)} />
                <datalist id="report-terms">{terms.map((name) => <option key={name} value={name} />)}</datalist>
              </>
            )}
          </Field>
          <div className="pt-6">
            <Button type="submit" disabled={generate.isPending}>
              {generate.isPending ? t("reportCards.generating") : t("reportCards.generate")}
            </Button>
          </div>
        </form>
        <p role="status" aria-live="polite" className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          {generate.isPending ? t("reportCards.renderingHint") : ""}
        </p>
        {failure && <p role="alert" className="mt-1 text-sm font-bold text-red-700 dark:text-red-400">{failure}</p>}
      </Card>

      {cards === null ? (
        !generate.isPending && <Card><EmptyState title={t("reportCards.pickClassAndTerm")} /></Card>
      ) : (
        <Card className="p-0">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <CardTitle>{cards.length === 1 ? t("reportCards.cardGenerated", { count: 1 }) : t("reportCards.cardsGenerated", { count: cards.length })}</CardTitle>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {cards.map((card) => {
              const url = safeUrl(card.file.url);
              return (
                <li key={card.studentId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar name={card.studentName} />
                  <span className="min-w-0 flex-1 font-bold text-slate-900 dark:text-slate-50">{card.studentName}</span>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[2.75rem] items-center rounded-lg bg-brand-50 px-4 text-sm font-extrabold text-brand-700 hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200">
                      {t("reportCards.openPdf")}
                      <span className="sr-only"> {card.studentName}</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
