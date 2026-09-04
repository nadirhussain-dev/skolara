"use client";

import {
  useMyMeetingSlots,
  usePublishMeetingSlots,
  useWithdrawMeetingSlot,
} from "@skolara/api-client";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
} from "@skolara/ui";
import { useState } from "react";

/**
 * Builds a run of back-to-back slots from a start time, so publishing an
 * evening of appointments is one action rather than ten.
 */
function buildSlots(
  date: string,
  startTime: string,
  minutes: number,
  count: number,
): { startsAt: Date; endsAt: Date }[] {
  const slots: { startsAt: Date; endsAt: Date }[] = [];
  const first = new Date(`${date}T${startTime}:00`);

  for (let i = 0; i < count; i += 1) {
    const startsAt = new Date(first.getTime() + i * minutes * 60_000);
    slots.push({ startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000) });
  }
  return slots;
}

export default function TeacherMeetingsPage() {
  const { data: slots, isLoading } = useMyMeetingSlots();
  const publish = usePublishMeetingSlots();
  const withdraw = useWithdrawMeetingSlot();

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [minutes, setMinutes] = useState(10);
  const [count, setCount] = useState(8);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const preview = date ? buildSlots(date, startTime, minutes, count) : [];
  const firstSlot = preview.at(0);
  const lastSlot = preview.at(-1);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await publish.mutateAsync({ slots: buildSlots(date, startTime, minutes, count) });
      setMessage(
        result.published === result.requested
          ? `Published ${result.published} slots.`
          : `Published ${result.published} of ${result.requested} — the rest were already offered.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish those slots");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Parent meetings"
        description="Offer appointment slots. Parents book them from the app."
      />

      <Card>
        <CardHeader>
          <CardTitle>Offer an evening of slots</CardTitle>
        </CardHeader>
        <form onSubmit={handlePublish} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Date
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              First slot
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Minutes each
              <Input
                type="number"
                min={5}
                max={60}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="max-w-[110px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              How many
              <Input
                type="number"
                min={1}
                max={60}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="max-w-[110px]"
              />
            </label>
            <Button type="submit" disabled={publish.isPending || !date}>
              {publish.isPending ? "Publishing…" : "Publish"}
            </Button>
          </div>

          {firstSlot && lastSlot && (
            <p className="text-sm text-slate-500">
              {firstSlot.startsAt.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" – "}
              {lastSlot.endsAt.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" · "}
              {preview.length} slots
            </p>
          )}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your slots</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && slots?.length === 0 && (
          <EmptyState title="No slots offered yet." />
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {slots?.map((slot) => (
            <li key={slot.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium tabular-nums">
                  {new Date(slot.startsAt).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {slot.bookedByParentUser && slot.student && (
                  <p className="text-sm text-slate-500">
                    {slot.bookedByParentUser.firstName} {slot.bookedByParentUser.lastName} · about{" "}
                    {slot.student.user.firstName}
                    {slot.bookedByParentUser.phone ? ` · ${slot.bookedByParentUser.phone}` : ""}
                  </p>
                )}
                {slot.note && <p className="mt-1 text-sm text-slate-500">{slot.note}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {slot.bookedByParentUser ? (
                  <Badge tone="success">Booked</Badge>
                ) : (
                  <>
                    <Badge tone="neutral">Free</Badge>
                    <Button variant="ghost" onClick={() => withdraw.mutate(slot.id)}>
                      Withdraw
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
