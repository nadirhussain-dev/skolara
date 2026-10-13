"use client";

import { useCancelLeave, useLeaveBalances, useMyLeave, useRequestLeave } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { LeaveKind, LeaveStatus } from "@skolara/types";
import { Badge, Button, Card, CardTitle, EmptyState, Input, ProgressBar, Textarea, cn } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { daysCovered } from "@/components/request-review";
import { Field, ListState, PageTitle } from "@/components/ui-kit";
import { intlLocale } from "@/lib/intl";

const KINDS: LeaveKind[] = ["CASUAL", "SICK", "UNPAID", "MATERNITY", "OTHER"];
const TONE: Record<LeaveStatus, "warning" | "success" | "danger" | "neutral"> = { PENDING: "warning", APPROVED: "success", REJECTED: "danger", CANCELLED: "neutral" };
const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** A teacher's own time off: what is left, what is asked for, and the answer. */
export default function TeacherLeavePage() {
  const { t, locale } = useTranslation();
  const balances = useLeaveBalances();
  const mine = useMyLeave();
  const request = useRequestLeave();
  const cancel = useCancelLeave();
  const [kind, setKind] = useState<LeaveKind>("CASUAL");
  const [start, setStart] = useState(() => isoDay(new Date()));
  const [end, setEnd] = useState(() => isoDay(new Date()));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const formatDay = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", day: "numeric", month: "short" });

  function submit(event: FormEvent) {
    event.preventDefault();
    setSent(false);
    if (end < start) {
      setError(t("staffLeave.endAfterStart"));
      return;
    }
    setError(null);
    request.mutate(
      { kind, startDate: new Date(`${start}T00:00:00Z`), endDate: new Date(`${end}T00:00:00Z`), reason: reason.trim() || undefined },
      { onSuccess: () => { setReason(""); setSent(true); }, onError: (e) => setError(e instanceof Error ? e.message : t("common.somethingWentWrong")) },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t("staffLeave.title")} subtitle={t("staffLeave.subtitle")} />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(balances.data ?? []).filter((b) => b.allowanceDays !== null).map((b) => (
          <li key={b.kind}>
            <Card className="h-full">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{t(`leaveKind.${b.kind}`)}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{b.remainingDays === 1 ? t("staffLeave.leftOne") : t("staffLeave.left", { count: b.remainingDays ?? 0 })}</p>
              <ProgressBar className="mt-2" label={t("staffLeave.usedOf", { used: b.usedDays, total: b.allowanceDays ?? 0 })} value={b.allowanceDays ? Math.round((b.usedDays / b.allowanceDays) * 100) : 0} />
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t("staffLeave.usedOf", { used: b.usedDays, total: b.allowanceDays ?? 0 })}</p>
            </Card>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardTitle>{t("staffLeave.ask")}</CardTitle>
          <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
            <fieldset>
              <legend className="mb-1 block text-sm font-bold text-slate-900 dark:text-slate-50">{t("staffLeave.kind")}</legend>
              <div className="flex flex-wrap gap-2">
                {KINDS.map((k) => (
                  <label key={k} className={cn("flex min-h-[2.5rem] cursor-pointer items-center rounded-xl border px-3 text-sm font-bold focus-within:outline focus-within:outline-2 focus-within:outline-brand-700", kind === k ? "border-brand-700 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-100" : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300")}>
                    <input type="radio" name="kind" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                    {t(`leaveKind.${k}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("staffLeave.from")}>{(props) => <Input {...props} type="date" value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} />}</Field>
              <Field label={t("staffLeave.to")} error={error}>{(props) => <Input {...props} type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />}</Field>
            </div>
            <Field label={t("staffLeave.reason")} optional>{(props) => <Textarea {...props} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
            <Button type="submit" disabled={request.isPending}>{t("staffLeave.send")}</Button>
            <p role="status" aria-live="polite" className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{sent ? t("staffLeave.sent") : ""}</p>
          </form>
        </Card>

        <Card className="p-0">
          <div className="px-5 pt-4"><CardTitle>{t("staffLeave.yourRequests")}</CardTitle></div>
          {mine.isLoading || mine.isError ? (
            <ListState isError={mine.isError} isLoading={mine.isLoading} onRetry={() => void mine.refetch()} errorText={t("review.loadError")} />
          ) : (mine.data ?? []).length === 0 ? (
            <div className="p-5"><EmptyState title={t("staffLeave.none")} /></div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(mine.data ?? []).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-50">{t(`leaveKind.${r.kind}`)} · {daysCovered(r.startDate, r.endDate) === 1 ? t("staffLeave.dayOne") : t("staffLeave.days", { count: daysCovered(r.startDate, r.endDate) })}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{formatDay.format(new Date(r.startDate))} – {formatDay.format(new Date(r.endDate))}</p>
                    {r.reviewNote && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">“{r.reviewNote}”</p>}
                  </div>
                  <Badge tone={TONE[r.status]}>{t(`leaveStatus.${r.status}`)}</Badge>
                  {r.status === "PENDING" && <Button variant="ghost" disabled={cancel.isPending} onClick={() => cancel.mutate(r.id)}>{t("staffLeave.withdraw")}</Button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
