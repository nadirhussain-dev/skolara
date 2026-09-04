"use client";

import {
  useApiClient,
  useClassQuizzes,
  useCreateQuiz,
  useDeleteQuiz,
  usePublishQuiz,
} from "@skolara/api-client";
import { MAX_QUIZ_OPTIONS, type SchoolClass } from "@skolara/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

type DraftQuestion = { prompt: string; options: string[]; correctIndex: number; marks: number };

const blankQuestion = (): DraftQuestion => ({
  prompt: "",
  options: ["", ""],
  correctIndex: 0,
  marks: 1,
});

export default function QuizzesPage() {
  const api = useApiClient();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [classId, setClassId] = useState("");
  const { data: quizzes, isLoading } = useClassQuizzes(classId || undefined);

  const create = useCreateQuiz();
  const publish = usePublishQuiz();
  const remove = useDeleteQuiz();

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [gradeTerm, setGradeTerm] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [error, setError] = useState("");

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...patch } : question)),
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              options: question.options.map((option, j) => (j === optionIndex ? value : option)),
            }
          : question,
      ),
    );
  }

  const totalMarks = questions.reduce((sum, question) => sum + Number(question.marks || 0), 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!classId) return;

    try {
      await create.mutateAsync({
        classId,
        subject,
        title,
        instructions: instructions || undefined,
        timeLimitMinutes: timeLimit ? Number(timeLimit) : undefined,
        maxAttempts,
        // Both or neither — the API refuses half a gradebook target. The
        // assessment name is the quiz title, so a mark is findable by the name
        // the class knows it by.
        gradeTerm: gradeTerm || undefined,
        gradeExamType: gradeTerm ? title : undefined,
        questions,
      });
      setTitle("");
      setInstructions("");
      setQuestions([blankQuestion()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that quiz");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Quizzes"
        description="Multiple-choice papers, marked automatically the moment a student submits."
      />

      <Card>
        <CardHeader>
          <CardTitle>New quiz</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <Select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="max-w-xs"
          >
            <option value="">Select class</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.section}
              </option>
            ))}
          </Select>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Subject
              <Input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="max-w-[160px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Title
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="max-w-[240px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Time limit (min)
              <Input
                type="number"
                min={1}
                max={480}
                placeholder="none"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="max-w-[130px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Attempts
              <Input
                type="number"
                min={1}
                max={10}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="max-w-[100px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Gradebook term
              <Input
                placeholder="leave blank to keep out"
                value={gradeTerm}
                onChange={(e) => setGradeTerm(e.target.value)}
                className="max-w-[220px]"
              />
            </label>
          </div>

          <Textarea
            placeholder="Instructions for the class (optional)"
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />

          <div className="flex flex-col gap-4">
            {questions.map((question, questionIndex) => (
              <div
                key={questionIndex}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-2.5 text-sm text-slate-400">{questionIndex + 1}.</span>
                  <Input
                    required
                    placeholder="Question"
                    value={question.prompt}
                    onChange={(e) => updateQuestion(questionIndex, { prompt: e.target.value })}
                  />
                  <label className="flex shrink-0 flex-col gap-1 text-xs text-slate-500">
                    Marks
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={question.marks}
                      onChange={(e) =>
                        updateQuestion(questionIndex, { marks: Number(e.target.value) })
                      }
                      className="w-[80px]"
                    />
                  </label>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() =>
                        setQuestions((current) =>
                          current.filter((_, i) => i !== questionIndex),
                        )
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 pl-6">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-2 text-sm">
                      {/* The radio is the answer key — one option per question. */}
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={question.correctIndex === optionIndex}
                        onChange={() =>
                          updateQuestion(questionIndex, { correctIndex: optionIndex })
                        }
                      />
                      <Input
                        required
                        placeholder={`Option ${optionIndex + 1}`}
                        value={option}
                        onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                      />
                      {question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            updateQuestion(questionIndex, {
                              options: question.options.filter((_, j) => j !== optionIndex),
                              // Removing the option that was marked correct
                              // must not leave the key pointing past the end.
                              correctIndex:
                                question.correctIndex >= optionIndex && question.correctIndex > 0
                                  ? question.correctIndex - 1
                                  : question.correctIndex,
                            })
                          }
                        >
                          ×
                        </Button>
                      )}
                    </label>
                  ))}
                  {question.options.length < MAX_QUIZ_OPTIONS && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="self-start"
                      onClick={() =>
                        updateQuestion(questionIndex, { options: [...question.options, ""] })
                      }
                    >
                      Add option
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setQuestions((current) => [...current, blankQuestion()])}
            >
              Add question
            </Button>
            <Button type="submit" disabled={create.isPending || !classId}>
              {create.isPending ? "Saving…" : "Save as draft"}
            </Button>
            <p className="text-sm text-slate-500">
              {questions.length} question{questions.length === 1 ? "" : "s"} · {totalMarks} marks
            </p>
          </div>
          {!classId && <p className="text-sm text-slate-500">Pick a class first.</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quizzes for this class</CardTitle>
        </CardHeader>
        {!classId && <p className="text-sm text-slate-500">Select a class to see its quizzes.</p>}
        {classId && isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {classId && !isLoading && quizzes?.length === 0 && (
          <EmptyState icon="🧠" title="No quizzes yet." />
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {quizzes?.map((quiz) => (
            <li key={quiz.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/school/quizzes/${quiz.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {quiz.title}
                  </Link>
                  <Badge tone="neutral">{quiz.subject}</Badge>
                  {quiz.publishedAt ? (
                    <Badge tone="success">Published</Badge>
                  ) : (
                    <Badge tone="warning">Draft</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {quiz._count.questions} questions · {quiz._count.attempts} attempts
                  {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : " · untimed"}
                  {quiz.gradeTerm ? ` · counts toward ${quiz.gradeTerm}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!quiz.publishedAt && (
                  <Button variant="secondary" onClick={() => publish.mutate(quiz.id)}>
                    Publish
                  </Button>
                )}
                {quiz._count.attempts === 0 && (
                  <Button variant="ghost" onClick={() => remove.mutate(quiz.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
