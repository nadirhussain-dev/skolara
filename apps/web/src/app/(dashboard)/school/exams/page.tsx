"use client";

import {
  useApiClient,
  useClassExams,
  useCreateExam,
  useExamRankList,
} from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input, Select } from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function ExamsPage() {
  const api = useApiClient();
  const { t } = useTranslation();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [classId, setClassId] = useState("");
  const { data: exams, isLoading } = useClassExams(classId);
  const createExam = useCreateExam();
  const [selectedExamId, setSelectedExamId] = useState<string>();
  const { data: rankList } = useExamRankList(selectedExamId);

  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [examType, setExamType] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) return;
    await createExam.mutateAsync({
      classId,
      name,
      term,
      examType,
      scheduledDate: new Date(scheduledDate),
    });
    setName("");
    setTerm("");
    setExamType("");
    setScheduledDate("");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("exams.scheduleExam")}</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="max-w-xs">
            <option value="">{t("fields.selectClass")}</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.section}
              </option>
            ))}
          </Select>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder={t("exams.nameHint")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder={t("fields.term")}
            required
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder={t("exams.typeHint")}
            required
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            type="date"
            required
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="max-w-[160px]"
          />
          <Button type="submit" disabled={!classId || createExam.isPending}>
            {createExam.isPending ? t("exams.scheduling") : t("exams.schedule")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("exams.title")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {classId && exams?.length === 0 && <EmptyState title={t("exams.noExams")} />}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {exams?.map((exam) => (
            <button
              key={exam.id}
              onClick={() => setSelectedExamId(exam.id)}
              className="flex items-center justify-between py-3 text-left hover:text-brand-700"
            >
              <span className="font-medium">
                {exam.name} ({exam.examType})
              </span>
              <span className="text-sm text-slate-500">{exam.term}</span>
            </button>
          ))}
        </div>
      </Card>

      {selectedExamId && (
        <Card>
          <CardHeader>
            <CardTitle>{t("exams.rankList")}</CardTitle>
          </CardHeader>
          {rankList?.length === 0 && <EmptyState title={t("exams.noGradesYet")} />}
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {rankList?.map((row) => (
              <div key={row.studentId} className="flex items-center justify-between py-3">
                <span className="font-medium">
                  #{row.rank} {row.firstName} {row.lastName}
                </span>
                <span className="text-sm text-slate-500">
                  {t("exams.marksSummary", {
                    obtained: row.totalMarksObtained,
                    max: row.totalMaxMarks,
                    percentage: row.percentage.toFixed(1),
                  })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
