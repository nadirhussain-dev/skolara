"use client";

import { useApiClient, useStudentPerformance, type StudentWithUser } from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Select,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PerformanceLegend, SubjectPerformanceChart } from "@/components/performance-chart";

export default function PerformancePage() {
  const api = useApiClient();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [showTable, setShowTable] = useState(false);

  const { data: students } = useQuery<StudentWithUser[]>({
    queryKey: ["students", "class", classId],
    queryFn: () => api.students.byClass(classId),
    enabled: Boolean(classId),
  });

  const { data: performance, isLoading } = useStudentPerformance(studentId || undefined);

  const student = students?.find((candidate) => candidate.id === studentId);
  const studentLabel = student ? student.user.firstName : "Student";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Performance over time"
        description="Every assessment as a percentage, per subject, against the class average for the same paper."
      />

      {/* One filter row above everything it scopes. */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Class
            <Select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setStudentId("");
              }}
              className="max-w-xs"
            >
              <option value="">Select class</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.section}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Student
            <Select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="max-w-xs"
              disabled={!classId}
            >
              <option value="">Select student</option>
              {students?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.firstName} {s.user.lastName} · {s.admissionNumber}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </Card>

      {!studentId && (
        <Card>
          <EmptyState
            icon="📈"
            title="Pick a student."
            description="Their marks are plotted per subject in the order they were graded."
          />
        </Card>
      )}

      {studentId && isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {studentId && performance && performance.subjects.length === 0 && (
        <Card>
          <EmptyState
            title="No marks recorded yet."
            description="Once exams or quizzes are graded, the curve appears here."
          />
        </Card>
      )}

      {studentId && performance && performance.subjects.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard
              label="Overall average"
              value={
                performance.overallAverage === null
                  ? "—"
                  : `${performance.overallAverage}%`
              }
              icon="📊"
            />
            <StatCard label="Subjects" value={performance.subjects.length} icon="📚" />
            <StatCard
              label="Assessments"
              value={performance.subjects.reduce(
                (sum, subject) => sum + subject.points.length,
                0,
              )}
              icon="📝"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>By subject</CardTitle>
            </CardHeader>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <PerformanceLegend studentLabel={studentLabel} />
              {/* The table twin: every plotted value readable without hovering. */}
              <Button variant="ghost" onClick={() => setShowTable((current) => !current)}>
                {showTable ? "Show charts" : "Show as table"}
              </Button>
            </div>

            {showTable ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Subject</TH>
                    <TH>Term</TH>
                    <TH>Assessment</TH>
                    <TH>{studentLabel}</TH>
                    <TH>Class average</TH>
                  </TR>
                </THead>
                <TBody>
                  {performance.subjects.flatMap((subject) =>
                    subject.points.map((point) => (
                      <TR key={`${subject.subject}-${point.term}-${point.examType}`}>
                        <TD>{subject.subject}</TD>
                        <TD>{point.term}</TD>
                        <TD>{point.examType}</TD>
                        <TD className="tabular-nums">{point.percentage}%</TD>
                        <TD className="tabular-nums">
                          {point.classAveragePercentage === null
                            ? "—"
                            : `${point.classAveragePercentage}%`}
                        </TD>
                      </TR>
                    )),
                  )}
                </TBody>
              </Table>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {performance.subjects.map((subject) => (
                  <SubjectPerformanceChart
                    key={subject.subject}
                    subject={subject}
                    studentLabel={studentLabel}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
