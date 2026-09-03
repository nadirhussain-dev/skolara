"use client";

import {
  useAddSyllabusTopics,
  useApiClient,
  useClassLessonPlans,
  useCreateLessonPlan,
  useRemoveLessonPlan,
  useRemoveSyllabusTopic,
  useSyllabusCoverage,
  useSyllabusTopics,
  useUpdateSyllabusTopic,
} from "@skolara/api-client";
import {
  SYLLABUS_STATUS_LABELS,
  type Period,
  type SchoolClass,
  type SyllabusTopicStatus,
} from "@skolara/types";
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
import { useMemo, useState } from "react";

const STATUS_TONE: Record<SyllabusTopicStatus, "neutral" | "warning" | "success"> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
};

/** The next status in the cycle, so one click moves a topic along. */
const NEXT_STATUS: Record<SyllabusTopicStatus, SyllabusTopicStatus> = {
  NOT_STARTED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "NOT_STARTED",
};

function CoverageBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="h-full rounded-full bg-brand-gradient"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function LessonPlansPage() {
  const api = useApiClient();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });
  const { data: periods } = useQuery<Period[]>({
    queryKey: ["periods"],
    queryFn: () => api.timetable.periods(),
  });

  const [classId, setClassId] = useState("");
  const [term, setTerm] = useState("");

  const { data: topics } = useSyllabusTopics(classId || undefined, {
    term: term || undefined,
  });
  const { data: coverage } = useSyllabusCoverage(classId || undefined, term || undefined);
  const { data: plans } = useClassLessonPlans(classId || undefined);

  const addTopics = useAddSyllabusTopics();
  const updateTopic = useUpdateSyllabusTopic();
  const removeTopic = useRemoveSyllabusTopic();
  const createPlan = useCreateLessonPlan();
  const removePlan = useRemoveLessonPlan();

  // Syllabus entry
  const [topicSubject, setTopicSubject] = useState("");
  const [topicTerm, setTopicTerm] = useState("");
  const [topicList, setTopicList] = useState("");
  const [topicMessage, setTopicMessage] = useState("");
  const [topicError, setTopicError] = useState("");

  // Lesson plan
  const [planSubject, setPlanSubject] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planPeriodId, setPlanPeriodId] = useState("");
  const [planTopicId, setPlanTopicId] = useState("");
  const [planObjectives, setPlanObjectives] = useState("");
  const [planActivities, setPlanActivities] = useState("");
  const [planResources, setPlanResources] = useState("");
  const [planError, setPlanError] = useState("");

  // Only topics on the subject being planned can be pinned — the API refuses
  // the rest, so offering them would be a dead end.
  const pinnableTopics = useMemo(
    () => (topics ?? []).filter((topic) => topic.subject === planSubject),
    [topics, planSubject],
  );

  async function handleAddTopics(e: React.FormEvent) {
    e.preventDefault();
    setTopicError("");
    setTopicMessage("");
    // One topic per line: a term's syllabus comes off a curriculum document as
    // a list, and making a teacher click "add row" thirty times is why nobody
    // fills these in.
    const lines = topicList
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    try {
      const result = await addTopics.mutateAsync({
        classId,
        subject: topicSubject,
        term: topicTerm,
        topics: lines.map((title) => ({ title })),
      });
      setTopicList("");
      setTopicMessage(
        result.added === result.requested
          ? `Added ${result.added} topics.`
          : `Added ${result.added} of ${result.requested} — the rest were already listed.`,
      );
    } catch (err) {
      setTopicError(err instanceof Error ? err.message : "Couldn't add those topics");
    }
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setPlanError("");
    try {
      await createPlan.mutateAsync({
        classId,
        subject: planSubject,
        title: planTitle,
        date: new Date(planDate),
        periodId: planPeriodId || null,
        topicId: planTopicId || null,
        objectives: planObjectives || null,
        activities: planActivities || null,
        resources: planResources || null,
      });
      setPlanTitle("");
      setPlanObjectives("");
      setPlanActivities("");
      setPlanResources("");
      setPlanTopicId("");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Couldn't save that lesson plan");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lesson planning & syllabus"
        description="What you mean to teach, and how much of the term's syllabus is actually covered."
      />

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Class
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
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Term
            <Input
              placeholder="all terms"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="max-w-[200px]"
            />
          </label>
        </div>
      </Card>

      {!classId && (
        <Card>
          <EmptyState
            icon="🗂️"
            title="Pick a class."
            description="Syllabus coverage and lesson plans are per class and subject."
          />
        </Card>
      )}

      {classId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Syllabus coverage</CardTitle>
            </CardHeader>
            {coverage?.length === 0 && (
              <EmptyState
                title="No syllabus entered yet."
                description="Add the term's topics below and coverage follows from their status."
              />
            )}
            <div className="flex flex-col gap-4">
              {coverage?.map((row) => (
                <div key={`${row.subject}-${row.term}`} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      {row.subject}
                      <span className="ml-2 text-sm font-normal text-slate-400">{row.term}</span>
                    </p>
                    <p className="text-sm tabular-nums text-slate-500">
                      {row.completed}/{row.total} covered · {row.percentComplete}%
                      {row.overdue > 0 && (
                        <span className="ml-2 text-rose-600">{row.overdue} overdue</span>
                      )}
                    </p>
                  </div>
                  <CoverageBar percent={row.percentComplete} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add syllabus topics</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddTopics} className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Input
                  required
                  placeholder="Subject"
                  value={topicSubject}
                  onChange={(e) => setTopicSubject(e.target.value)}
                  className="max-w-[180px]"
                />
                <Input
                  required
                  placeholder="Term"
                  value={topicTerm}
                  onChange={(e) => setTopicTerm(e.target.value)}
                  className="max-w-[180px]"
                />
              </div>
              <Textarea
                required
                rows={5}
                placeholder={"One topic per line\nWaves and sound\nRefraction\nLenses"}
                value={topicList}
                onChange={(e) => setTopicList(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={addTopics.isPending}>
                  {addTopics.isPending ? "Adding…" : "Add topics"}
                </Button>
                {topicMessage && <p className="text-sm text-emerald-600">{topicMessage}</p>}
                {topicError && <p className="text-sm text-rose-600">{topicError}</p>}
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Topics</CardTitle>
            </CardHeader>
            {topics?.length === 0 && <EmptyState title="No topics yet." />}
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {topics?.map((topic) => (
                <li key={topic.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{topic.title}</p>
                      <Badge tone="neutral">{topic.subject}</Badge>
                      <Badge tone={STATUS_TONE[topic.status]}>
                        {SYLLABUS_STATUS_LABELS[topic.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {topic.term}
                      {topic.plannedForDate
                        ? ` · planned ${new Date(topic.plannedForDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : ""}
                      {topic.completedOn
                        ? ` · covered ${new Date(topic.completedOn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : ""}
                      {topic._count.lessons > 0
                        ? ` · ${topic._count.lessons} lesson${topic._count.lessons === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        updateTopic.mutate({
                          id: topic.id,
                          input: { status: NEXT_STATUS[topic.status] },
                        })
                      }
                    >
                      Mark {SYLLABUS_STATUS_LABELS[NEXT_STATUS[topic.status]].toLowerCase()}
                    </Button>
                    <Button variant="ghost" onClick={() => removeTopic.mutate(topic.id)}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New lesson plan</CardTitle>
            </CardHeader>
            <form onSubmit={handleCreatePlan} className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Input
                  required
                  placeholder="Subject"
                  value={planSubject}
                  onChange={(e) => {
                    setPlanSubject(e.target.value);
                    // A pinned topic belongs to a subject; changing the subject
                    // invalidates the pin.
                    setPlanTopicId("");
                  }}
                  className="max-w-[180px]"
                />
                <Input
                  required
                  placeholder="Lesson title"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="max-w-[240px]"
                />
                <Input
                  required
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="max-w-[180px]"
                />
                <Select
                  value={planPeriodId}
                  onChange={(e) => setPlanPeriodId(e.target.value)}
                  className="max-w-[180px]"
                >
                  <option value="">Any period</option>
                  {periods?.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name} · {period.startTime}
                    </option>
                  ))}
                </Select>
                <Select
                  value={planTopicId}
                  onChange={(e) => setPlanTopicId(e.target.value)}
                  className="max-w-[240px]"
                  disabled={pinnableTopics.length === 0}
                >
                  <option value="">No syllabus topic</option>
                  {pinnableTopics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </Select>
              </div>
              <Textarea
                rows={2}
                placeholder="Objectives — what should they be able to do afterwards? (optional)"
                value={planObjectives}
                onChange={(e) => setPlanObjectives(e.target.value)}
              />
              <Textarea
                rows={3}
                placeholder="Activities (optional)"
                value={planActivities}
                onChange={(e) => setPlanActivities(e.target.value)}
              />
              <Textarea
                rows={2}
                placeholder="Resources needed (optional)"
                value={planResources}
                onChange={(e) => setPlanResources(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={createPlan.isPending}>
                  {createPlan.isPending ? "Saving…" : "Save plan"}
                </Button>
                {planError && <p className="text-sm text-rose-600">{planError}</p>}
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Planned lessons</CardTitle>
            </CardHeader>
            {plans?.length === 0 && <EmptyState title="No lessons planned yet." />}
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {plans?.map((plan) => (
                <li key={plan.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{plan.title}</p>
                      <Badge tone="neutral">{plan.subject}</Badge>
                      {plan.topic && <Badge tone="info">{plan.topic.title}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(plan.date).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {plan.period ? ` · ${plan.period.name}` : ""} · {plan.teacherUser.firstName}{" "}
                      {plan.teacherUser.lastName}
                    </p>
                    {plan.objectives && (
                      <p className="mt-1 text-sm text-slate-500">{plan.objectives}</p>
                    )}
                    {plan.activities && (
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-500">
                        {plan.activities}
                      </p>
                    )}
                    {plan.resources && (
                      <p className="mt-1 text-sm text-slate-400">Needs: {plan.resources}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => removePlan.mutate(plan.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
