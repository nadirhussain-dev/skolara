"use client";

import {
  useApiClient,
  useGenerateClassReportCards,
  type GeneratedReportCard,
} from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
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
import { useState } from "react";

export default function ReportCardsPage() {
  const api = useApiClient();
  const { t } = useTranslation();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });
  const generate = useGenerateClassReportCards();

  const [classId, setClassId] = useState("");
  const [term, setTerm] = useState("");
  const [cards, setCards] = useState<GeneratedReportCard[]>([]);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCards([]);
    try {
      setCards(await generate.mutateAsync({ classId, term }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reportCards.couldNotGenerate"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("reportCards.title")}
        description={t("reportCards.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("reportCards.generateForClass")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {t("reportCards.class")}
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">{t("reportCards.selectAClass")}</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("fields.term")}
            <Input
              placeholder={t("reportCards.termHint")}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              required
            />
          </label>
          <Button type="submit" disabled={generate.isPending}>
            {generate.isPending ? t("reportCards.generating") : t("reportCards.generate")}
          </Button>
        </form>

        {generate.isPending && (
          <p className="mt-3 text-sm text-slate-500">
            {t("reportCards.renderingHint")}
          </p>
        )}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </Card>

      {cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {cards.length === 1
                ? t("reportCards.cardGenerated", { count: cards.length })
                : t("reportCards.cardsGenerated", { count: cards.length })}
            </CardTitle>
          </CardHeader>
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {cards.map((card) => (
              <li
                key={card.studentId}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="font-medium">{card.studentName}</span>
                <a
                  href={card.file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-brand-700 underline"
                >
                  {t("reportCards.openPdf")}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {cards.length === 0 && !generate.isPending && !error && (
        <EmptyState title={t("reportCards.pickClassAndTerm")} />
      )}
    </div>
  );
}
