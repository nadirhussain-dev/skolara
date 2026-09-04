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
import { useTranslation } from "@skolara/i18n";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

/** `datetime-local` gives a wall-clock string; the API wants an instant. */
function toDate(local: string): Date {
  return new Date(local);
}

export default function LiveClassesPage() {
  const api = useApiClient();
  const { t, locale } = useTranslation();
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
      setError(err instanceof Error ? err.message : t("liveClasses.couldNotSchedule"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("liveClasses.title")}
        description={t("liveClasses.description", {
          minutes: LIVE_CLASS_JOIN_LEAD_MINUTES,
        })}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("liveClasses.scheduleSession")}</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="max-w-xs">
            <option value="">{t("fields.selectClass")}</option>
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
              {t("fields.subject")}
              <Input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="max-w-[160px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("fields.title")}
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="max-w-[240px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("liveClasses.starts")}
              <Input
                required
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="max-w-[220px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("liveClasses.minutes")}
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
            placeholder={t("liveClasses.urlHint")}
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={create.isPending || !classId}>
              {create.isPending ? t("liveClasses.scheduling") : t("liveClasses.schedule")}
            </Button>
            {!classId && <p className="text-sm text-slate-500">{t("liveClasses.pickClassFirst")}</p>}
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("liveClasses.scheduledSessions")}</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <Button variant="ghost" onClick={() => setIncludePast((current) => !current)}>
            {includePast ? t("liveClasses.hideFinished") : t("liveClasses.showFinished")}
          </Button>
        </div>
        {!classId && <p className="text-sm text-slate-500">{t("liveClasses.selectClassForSessions")}</p>}
        {classId && isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {classId && !isLoading && sessions?.length === 0 && (
          <EmptyState icon="🎥" title={t("liveClasses.nothingScheduled")} />
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
                    {finished && <Badge tone="neutral">{t("liveClasses.finished")}</Badge>}
                  </div>
                  <p className="mt-1 text-sm tabular-nums text-slate-500">
                    {t("liveClasses.sessionWhen", {
                      start: start.toLocaleString(intlLocale(locale), {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                      end: end.toLocaleTimeString(intlLocale(locale), {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                      host: `${session.hostUser.firstName} ${session.hostUser.lastName}`,
                    })}
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
                  {t("common.cancel")}
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
