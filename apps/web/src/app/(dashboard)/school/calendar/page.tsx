"use client";

import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useApiClient,
} from "@skolara/api-client";
import type { CalendarEventCategory, SchoolClass } from "@skolara/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Textarea,
} from "@skolara/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const CATEGORIES: CalendarEventCategory[] = [
  "HOLIDAY",
  "EXAM",
  "MEETING",
  "ACTIVITY",
  "TERM_START",
  "TERM_END",
  "OTHER",
];

const CATEGORY_TONE: Record<CalendarEventCategory, "success" | "warning" | "info" | "danger" | "neutral"> = {
  HOLIDAY: "success",
  EXAM: "danger",
  MEETING: "info",
  ACTIVITY: "info",
  TERM_START: "warning",
  TERM_END: "warning",
  OTHER: "neutral",
};

function label(category: CalendarEventCategory) {
  return category.replace("_", " ").toLowerCase();
}

export default function CalendarPage() {
  const api = useApiClient();
  const { data: events, isLoading } = useCalendarEvents();
  const createEvent = useCreateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CalendarEventCategory>("HOLIDAY");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [classId, setClassId] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createEvent.mutateAsync({
        title,
        description: description || undefined,
        category,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt || startsAt),
        allDay,
        classId: classId || undefined,
      });
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that event");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Term dates, holidays and events. Class events only reach that class."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add an event</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CalendarEventCategory)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize dark:border-slate-700 dark:bg-slate-900"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {label(c)}
                </option>
              ))}
            </select>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Whole school</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Starts
              <Input
                type={allDay ? "date" : "datetime-local"}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Ends
              <Input
                type={allDay ? "date" : "datetime-local"}
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              All day
            </label>
          </div>

          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? "Saving…" : "Add event"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && events?.length === 0 && (
          <EmptyState title="Nothing on the calendar yet." />
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {events?.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-slate-500">
                  {new Date(event.startsAt).toLocaleDateString()}
                  {event.endsAt && new Date(event.endsAt).toDateString() !== new Date(event.startsAt).toDateString()
                    ? ` – ${new Date(event.endsAt).toLocaleDateString()}`
                    : ""}
                  {event.classId ? "" : " · whole school"}
                </p>
                {event.description && (
                  <p className="mt-1 text-sm text-slate-500">{event.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={CATEGORY_TONE[event.category]}>{label(event.category)}</Badge>
                <Button
                  variant="ghost"
                  onClick={() => deleteEvent.mutate(event.id)}
                  aria-label={`Remove ${event.title}`}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
