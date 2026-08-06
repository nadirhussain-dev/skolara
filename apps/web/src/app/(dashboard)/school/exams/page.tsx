"use client";

import {
  useApiClient,
  useClassExams,
  useCreateExam,
  useExamRankList,
} from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { Button, Card, CardHeader, CardTitle, EmptyState, Input, Select } from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function ExamsPage() {
  const api = useApiClient();
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
          <CardTitle>Schedule an exam</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="max-w-xs">
            <option value="">Select class</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.section}
              </option>
            ))}
          </Select>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder="Exam name (e.g. Midterm Exams)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="Term"
            required
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder="Exam type (e.g. Midterm)"
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
            {createExam.isPending ? "Scheduling..." : "Schedule exam"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exams</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {classId && exams?.length === 0 && <EmptyState title="No exams scheduled yet" />}
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
            <CardTitle>Rank list</CardTitle>
          </CardHeader>
          {rankList?.length === 0 && <EmptyState title="No grades recorded for this exam yet" />}
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {rankList?.map((row) => (
              <div key={row.studentId} className="flex items-center justify-between py-3">
                <span className="font-medium">
                  #{row.rank} {row.firstName} {row.lastName}
                </span>
                <span className="text-sm text-slate-500">
                  {row.totalMarksObtained}/{row.totalMaxMarks} ({row.percentage.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
