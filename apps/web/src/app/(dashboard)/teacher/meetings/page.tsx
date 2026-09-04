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
import { useTranslation } from "@skolara/i18n";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

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
  const { t, locale } = useTranslation();
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
          ? t("meetings.publishedAll", { count: result.published })
          : t("meetings.publishedSome", {
              published: result.published,
              requested: result.requested,
            }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("meetings.couldNotPublish"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("meetings.title")}
        description={t("meetings.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("meetings.offerEvening")}</CardTitle>
        </CardHeader>
        <form onSubmit={handlePublish} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              {t("common.date")}
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("meetings.firstSlot")}
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("meetings.minutesEach")}
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
              {t("meetings.howMany")}
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
              {publish.isPending ? t("meetings.publishing") : t("meetings.publish")}
            </Button>
          </div>

          {firstSlot && lastSlot && (
            <p className="text-sm text-slate-500">
              {t("meetings.previewRange", {
                from: firstSlot.startsAt.toLocaleTimeString(intlLocale(locale), {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                to: lastSlot.endsAt.toLocaleTimeString(intlLocale(locale), {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                count: preview.length,
              })}
            </p>
          )}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("meetings.yourSlots")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {!isLoading && slots?.length === 0 && (
          <EmptyState title={t("meetings.noSlots")} />
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {slots?.map((slot) => (
            <li key={slot.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium tabular-nums">
                  {new Date(slot.startsAt).toLocaleString(intlLocale(locale), {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {slot.bookedByParentUser && slot.student && (
                  <p className="text-sm text-slate-500">
                    {t("meetings.bookedBy", {
                      parent: `${slot.bookedByParentUser.firstName} ${slot.bookedByParentUser.lastName}`,
                      student: slot.student.user.firstName,
                    })}
                    {slot.bookedByParentUser.phone ? ` · ${slot.bookedByParentUser.phone}` : ""}
                  </p>
                )}
                {slot.note && <p className="mt-1 text-sm text-slate-500">{slot.note}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {slot.bookedByParentUser ? (
                  <Badge tone="success">{t("meetings.booked")}</Badge>
                ) : (
                  <>
                    <Badge tone="neutral">{t("meetings.free")}</Badge>
                    <Button variant="ghost" onClick={() => withdraw.mutate(slot.id)}>
                      {t("meetings.withdraw")}
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
