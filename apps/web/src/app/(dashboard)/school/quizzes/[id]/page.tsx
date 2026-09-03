"use client";

import { useQuiz, useQuizResults } from "@skolara/api-client";
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@skolara/ui";
import { useParams } from "next/navigation";

const STATUS_TONE = {
  IN_PROGRESS: "warning",
  SUBMITTED: "success",
  EXPIRED: "danger",
} as const;

export default function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: quiz, isLoading } = useQuiz(id);
  const { data: results } = useQuizResults(id);

  if (isLoading || !quiz) return <p className="text-sm text-slate-500">Loading…</p>;

  const sat = results?.rows.filter((row) => row.bestScore !== null) ?? [];
  const average =
    sat.length > 0
      ? Math.round((sat.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / sat.length) * 10) /
        10
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={quiz.title}
        description={`${quiz.subject} · ${quiz.class.name} — ${quiz.class.section}`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Questions" value={quiz.questions.length} icon="❓" />
        <StatCard label="Total marks" value={results?.maxScore ?? 0} icon="🎯" />
        <StatCard label="Sat it" value={`${sat.length}/${results?.rows.length ?? 0}`} icon="✍️" />
        <StatCard
          label="Class average"
          value={average === null ? "—" : `${average}%`}
          icon="📈"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        {results?.rows.length === 0 && (
          <EmptyState title="No students in this class yet." />
        )}
        {(results?.rows.length ?? 0) > 0 && (
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH>Attempts</TH>
                <TH>Best score</TH>
                <TH>%</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {results?.rows.map((row) => (
                <TR key={row.student.id}>
                  <TD>
                    {row.student.user.firstName} {row.student.user.lastName}
                    <span className="ml-2 text-xs text-slate-400">
                      {row.student.admissionNumber}
                    </span>
                  </TD>
                  <TD className="tabular-nums">{row.attemptCount}</TD>
                  <TD className="tabular-nums">
                    {row.bestScore === null ? "—" : `${row.bestScore} / ${results.maxScore}`}
                  </TD>
                  <TD className="tabular-nums">
                    {row.percentage === null ? "—" : `${row.percentage}%`}
                  </TD>
                  <TD>
                    {row.lastStatus ? (
                      <Badge tone={STATUS_TONE[row.lastStatus]}>
                        {row.lastStatus.toLowerCase().replace("_", " ")}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">not started</Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>The paper</CardTitle>
        </CardHeader>
        <ol className="flex flex-col gap-4">
          {quiz.questions.map((question, index) => (
            <li key={question.id}>
              <p className="font-medium">
                {index + 1}. {question.prompt}
                <span className="ml-2 text-sm font-normal text-slate-400">
                  {Number(question.marks)} mark{Number(question.marks) === 1 ? "" : "s"}
                </span>
              </p>
              <ul className="mt-1 flex flex-col gap-1 pl-5 text-sm">
                {question.options.map((option, optionIndex) => (
                  <li
                    key={optionIndex}
                    className={
                      optionIndex === question.correctIndex
                        ? "font-medium text-emerald-600"
                        : "text-slate-500"
                    }
                  >
                    {optionIndex === question.correctIndex ? "✓ " : "· "}
                    {option}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
