"use client";

import {
  useClassGrades,
  useStudentsByClass,
  useUpsertGrade,
} from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, Input } from "@skolara/ui";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function ClassGradebookPage() {
  const { classId } = useParams<{ classId: string }>();
  const [subject, setSubject] = useState("");
  const [term, setTerm] = useState("Term 1 2026");
  const [examType, setExamType] = useState("Midterm");

  const { data: students, isLoading: studentsLoading } = useStudentsByClass(classId);
  const { data: grades } = useClassGrades(classId, term);
  const upsertGrade = useUpsertGrade();

  const [marks, setMarks] = useState<
    Record<string, Partial<{ obtained: string; max: string }>>
  >({});

  const existingByStudent = useMemo(() => {
    const map = new Map<string, { marksObtained: number; maxMarks: number }>();
    grades
      ?.filter((g) => g.subject === subject && g.examType === examType)
      .forEach((g) => map.set(g.studentId, g));
    return map;
  }, [grades, subject, examType]);

  function setRow(studentId: string, field: "obtained" | "max", value: string) {
    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  async function save(studentId: string) {
    const row = marks[studentId];
    const existing = existingByStudent.get(studentId);
    const marksObtained = Number(row?.obtained ?? existing?.marksObtained ?? 0);
    const maxMarks = Number(row?.max ?? existing?.maxMarks ?? 100);
    if (!subject) return;
    await upsertGrade.mutateAsync({
      classId,
      studentId,
      subject,
      term,
      examType,
      marksObtained,
      maxMarks,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gradebook</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Subject (e.g. Mathematics)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="Term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            placeholder="Exam type"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="max-w-[160px]"
          />
        </div>
      </Card>

      <Card>
        {studentsLoading && <p className="text-sm text-slate-500">Loading roster...</p>}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {students?.map((student) => {
            const existing = existingByStudent.get(student.id);
            const row = marks[student.id];
            return (
              <div key={student.id} className="flex items-center gap-3 py-3">
                <span className="w-40 shrink-0">
                  {student.user.firstName} {student.user.lastName}
                </span>
                <Input
                  type="number"
                  placeholder="Marks"
                  className="w-24"
                  defaultValue={existing?.marksObtained}
                  onChange={(e) => setRow(student.id, "obtained", e.target.value)}
                />
                <span className="text-slate-400">/</span>
                <Input
                  type="number"
                  placeholder="Max"
                  className="w-24"
                  defaultValue={existing?.maxMarks ?? 100}
                  onChange={(e) => setRow(student.id, "max", e.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={!subject || upsertGrade.isPending}
                  onClick={() => save(student.id)}
                >
                  Save
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
