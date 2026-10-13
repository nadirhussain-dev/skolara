"use client";

import { useMyMeetingSlots, usePublishMeetingSlots, useWithdrawMeetingSlot, type MeetingSlotDetail } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Badge, Button, Card, CardTitle, EmptyState, Input, Select } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { Avatar, Field, ListState, PageTitle } from "@/components/ui-kit";
import { intlLocale } from "@/lib/intl";

/**
 * A run of back-to-back slots from a start time, so offering an evening of
 * appointments is one action rather than ten.
 */
function buildSlots(date: string, startTime: string, minutes: number, count: number) {
  const first = new Date(`${date}T${startTime}:00`);
  return Array.from({ length: count }, (_, i) => {
    const startsAt = new Date(first.getTime() + i * minutes * 60_000);
    return { startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000) };
  });
}

const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Parent–teacher meetings: offer slots here, parents book them in the app. */
export default function TeacherMeetingsPage() {
  const { t, locale } = useTranslation();
  const slots = useMyMeetingSlots();
  const publish = usePublishMeetingSlots();
  const withdraw = useWithdrawMeetingSlot();
  const [date, setDate] = useState(() => isoDay(new Date(Date.now() + 864e5)));
  const [startTime, setStartTime] = useState("14:00");
  const [minutes, setMinutes] = useState(10);
  const [count, setCount] = useState(6);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const tag = intlLocale(locale);
  const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" });
  const dayName = new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long" });

  const preview = date && startTime ? buildSlots(date, startTime, minutes, count) : [];
  const inPast = preview.length > 0 && preview[0]!.startsAt < new Date();

  function submit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    if (inPast) return;
    publish.mutate(
      { slots: preview },
      {
        onSuccess: (result) =>
          setStatus({
            tone: "ok",
            text: result.published === result.requested
              ? t("meetings.publishedAll", { count: result.published })
              : t("meetings.publishedSome", { published: result.published, requested: result.requested }),
          }),
        onError: (e) => setStatus({ tone: "error", text: e instanceof Error ? e.message : t("meetings.couldNotPublish") }),
      },
    );
  }

  const upcoming = (slots.data ?? []).filter((s) => new Date(s.endsAt) > new Date());
  const days = new Map<string, MeetingSlotDetail[]>();
  for (const slot of upcoming) {
    const key = isoDay(new Date(slot.startsAt));
    days.set(key, [...(days.get(key) ?? []), slot]);
  }
  const booked = upcoming.filter((s) => s.bookedByParentUser).length;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t("meetings.title")} subtitle={t("meetings.description")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardTitle>{t("meetings.offerEvening")}</CardTitle>
          <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
            <Field label={t("common.date")} error={inPast ? t("meetings.inPast") : null}>
              {(props) => <Input {...props} type="date" min={isoDay(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />}
            </Field>
            <Field label={t("meetings.firstSlot")}>
              {(props) => <Input {...props} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("meetings.minutesEach")}>
                {(props) => (
                  <Select {...props} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                    {[5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={t("meetings.howMany")}>
                {(props) => (
                  <Select {...props} value={count} onChange={(e) => setCount(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
                  </Select>
                )}
              </Field>
            </div>
            {preview.length > 0 && (
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {t("meetings.previewRange", { from: time.format(preview[0]!.startsAt), to: time.format(preview[preview.length - 1]!.endsAt), count: preview.length })}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
                  {preview.map((slot) => (
                    <li key={slot.startsAt.toISOString()} className="rounded-md bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300">{time.format(slot.startsAt)}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button type="submit" disabled={publish.isPending || inPast || preview.length === 0}>
              {publish.isPending ? t("meetings.publishing") : t("meetings.publish")}
            </Button>
            <p role="status" aria-live="polite" className={status?.tone === "error" ? "text-sm font-bold text-red-700 dark:text-red-400" : "text-sm font-bold text-emerald-700 dark:text-emerald-400"}>
              {status?.text}
            </p>
          </form>
        </Card>

        <Card className="p-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
            <CardTitle>{t("meetings.yourSlots")}</CardTitle>
            {upcoming.length > 0 && <p className="text-sm text-slate-600 dark:text-slate-400">{t("meetings.bookedCount", { booked, total: upcoming.length })}</p>}
          </div>
          {slots.isLoading || slots.isError ? (
            <ListState isError={slots.isError} isLoading={slots.isLoading} onRetry={() => void slots.refetch()} errorText={t("meetings.loadError")} />
          ) : upcoming.length === 0 ? (
            <div className="p-5"><EmptyState title={t("meetings.noSlots")} description={t("meetings.noSlotsBody")} /></div>
          ) : (
            <div className="flex flex-col gap-4 p-5">
              {[...days.entries()].map(([key, daySlots]) => (
                <section key={key} aria-label={dayName.format(new Date(daySlots[0]!.startsAt))}>
                  <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-400">{dayName.format(new Date(daySlots[0]!.startsAt))}</h3>
                  <ul className="flex flex-col gap-2">
                    {daySlots.map((slot) => (
                      <li key={slot.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
                        <span className="w-20 shrink-0 font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{time.format(new Date(slot.startsAt))}</span>
                        {slot.bookedByParentUser && slot.student ? (
                          <>
                            <Avatar name={`${slot.student.user.firstName} ${slot.student.user.lastName}`} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold text-slate-900 dark:text-slate-50">
                                {t("meetings.bookedBy", { parent: `${slot.bookedByParentUser.firstName} ${slot.bookedByParentUser.lastName}`, student: `${slot.student.user.firstName} ${slot.student.user.lastName}` })}
                              </p>
                              {slot.note && <p className="truncate text-sm text-slate-600 dark:text-slate-400">“{slot.note}”</p>}
                            </div>
                            <Badge tone="success">{t("meetings.booked")}</Badge>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-slate-600 dark:text-slate-400">{t("meetings.openForBooking")}</span>
                            <Badge tone="neutral">{t("meetings.free")}</Badge>
                            <Button variant="ghost" disabled={withdraw.isPending} onClick={() => withdraw.mutate(slot.id)}>{t("meetings.withdraw")}</Button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
