"use client";

import {
  useApiClient,
  useClassLiveClasses,
  useCreateLiveClass,
  useRemoveLiveClass,
} from "@skolara/api-client";
import { LIVE_CLASS_JOIN_LEAD_MINUTES, type SchoolClass } from "@skolara/types";
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
} from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

/** `datetime-local` gives a wall-clock string; the API wants an instant. */
function toDate(local: string): Date {
  return new Date(local);
}

export default function LiveClassesPage() {
  const api = useApiClient();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [classId, setClassId] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const { data: sessions, isLoading } = useClassLiveClasses(classId || undefined, includePast);

  const create = useCreateLiveClass();
  const remove = useRemoveLiveClass();

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [minutes, setMinutes] = useState(45);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!classId) return;
    try {
      const start = toDate(startsAt);
      await create.mutateAsync({
        classId,
        subject,
        title,
        meetingUrl,
        startsAt: start,
        // A duration rather than an end time: nobody schedules a lesson by
        // typing two timestamps, and the end matters here only because it is
        // when the join link stops working.
        endsAt: new Date(start.getTime() + minutes * 60_000),
      });
      setTitle("");
      setMeetingUrl("");
      setStartsAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't schedule that session");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Live classes"
        description={`Paste a Zoom, Meet or Teams link. Students get it ${LIVE_CLASS_JOIN_LEAD_MINUTES} minutes before the lesson and not before.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Schedule a session</CardTitle>
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
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
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
              Starts
              <Input
                required
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="max-w-[220px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Minutes
              <Input
                type="number"
                min={5}
                max={300}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="max-w-[110px]"
              />
            </label>
          </div>
          <Input
            required
            type="url"
            placeholder="https://meet.google.com/…"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={create.isPending || !classId}>
              {create.isPending ? "Scheduling…" : "Schedule"}
            </Button>
            {!classId && <p className="text-sm text-slate-500">Pick a class first.</p>}
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled sessions</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <Button variant="ghost" onClick={() => setIncludePast((current) => !current)}>
            {includePast ? "Hide finished" : "Show finished"}
          </Button>
        </div>
        {!classId && <p className="text-sm text-slate-500">Select a class to see its sessions.</p>}
        {classId && isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {classId && !isLoading && sessions?.length === 0 && (
          <EmptyState icon="🎥" title="Nothing scheduled." />
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {sessions?.map((session) => {
            const start = new Date(session.startsAt);
            const end = new Date(session.endsAt);
            const finished = end < new Date();
            return (
              <li key={session.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{session.title}</p>
                    <Badge tone="neutral">{session.subject}</Badge>
                    {finished && <Badge tone="neutral">Finished</Badge>}
                  </div>
                  <p className="mt-1 text-sm tabular-nums text-slate-500">
                    {start.toLocaleString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {session.hostUser.firstName} {session.hostUser.lastName}
                  </p>
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-sm text-brand-700 hover:underline"
                  >
                    {session.meetingUrl}
                  </a>
                </div>
                <Button
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => remove.mutate(session.id)}
                >
                  Cancel
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
