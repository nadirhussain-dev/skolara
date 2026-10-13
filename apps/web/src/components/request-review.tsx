"use client";

import { useTranslation, type MessageKey } from "@skolara/i18n";
import type { LeaveStatus } from "@skolara/types";
import { Badge, Button, Card, EmptyState, Textarea, cn } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { intlLocale } from "@/lib/intl";
import { Avatar, Field, FilterTabs, ListState, PageTitle, SidePanel } from "./ui-kit";

/** One request on a review screen, whatever kind it is. */
export interface ReviewItem {
  id: string;
  status: LeaveStatus;
  name: string;
  /** Who they are: a role, or a class and admission number. */
  detail: string;
  /** What kind of time off, when there is a kind. */
  kind?: string;
  startDate: Date | string;
  endDate: Date | string;
  reason: string | null;
  reviewNote: string | null;
  createdAt: Date | string;
  /** Who asked, when that is not the person themselves (a parent for a child). */
  raisedBy?: string;
}

type Filter = LeaveStatus | "ALL";

const TONE: Record<LeaveStatus, "warning" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

/** Calendar days covered, counting both ends. */
export function daysCovered(start: Date | string, end: Date | string): number {
  const day = 864e5;
  const from = Date.UTC(new Date(start).getUTCFullYear(), new Date(start).getUTCMonth(), new Date(start).getUTCDate());
  const to = Date.UTC(new Date(end).getUTCFullYear(), new Date(end).getUTCMonth(), new Date(end).getUTCDate());
  return Math.max(1, Math.round((to - from) / day) + 1);
}

/**
 * The approve-or-decline screen shared by staff leave and pupil absences.
 * Waiting requests come first and carry the two actions; declining always
 * asks for a reason, because the person on the other end is told it.
 */
export function RequestReview({
  title,
  subtitle,
  items,
  isLoading,
  isError,
  onRetry,
  loadError,
  onApprove,
  onDecline,
}: {
  title: string;
  subtitle: string;
  items: ReviewItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  loadError: string;
  /** Resolves to the confirmation to show. */
  onApprove: (id: string) => Promise<string>;
  onDecline: (id: string, note: string) => Promise<void>;
}) {
  const { t, locale } = useTranslation();
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [declining, setDeclining] = useState<ReviewItem | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const formatDay = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", day: "numeric", month: "short" });
  const formatShort = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" });
  const count = (s: Filter) => (items ?? []).filter((item) => s === "ALL" || item.status === s).length;
  const shown = (items ?? []).filter((item) => filter === "ALL" || item.status === filter);
  const options: { value: Filter; label: string; count?: number }[] = [
    { value: "PENDING", label: t("review.waiting"), count: count("PENDING") },
    { value: "APPROVED", label: t("leaveStatus.APPROVED") },
    { value: "REJECTED", label: t("review.declined") },
    { value: "ALL", label: t("common.all") },
  ];

  async function approve(item: ReviewItem) {
    setBusyId(item.id);
    setStatus(null);
    try {
      setStatus({ tone: "ok", text: await onApprove(item.id) });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : t("common.somethingWentWrong") });
    } finally {
      setBusyId(null);
    }
  }

  async function decline(event: FormEvent) {
    event.preventDefault();
    if (!declining) return;
    if (note.trim().length < 3) {
      setNoteError(t("review.reasonRequired"));
      return;
    }
    setBusyId(declining.id);
    try {
      await onDecline(declining.id, note.trim());
      setStatus({ tone: "ok", text: t("review.declinedSent", { name: declining.name }) });
      setDeclining(null);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : t("common.somethingWentWrong"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={title} subtitle={subtitle} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs label={t("review.filterLabel")} value={filter} options={options} onChange={setFilter} />
        <p role="status" aria-live="polite" className={cn("text-sm font-bold", status?.tone === "error" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
          {status?.text}
        </p>
      </div>

      {isError || isLoading ? (
        <Card className="p-0"><ListState isError={isError} isLoading={isLoading} onRetry={onRetry} errorText={loadError} rows={3} /></Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            title={filter === "PENDING" ? t("review.nothingWaiting") : t("review.noneHere")}
            description={filter === "PENDING" ? t("review.nothingWaitingBody") : undefined}
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {shown.map((item) => {
            const days = daysCovered(item.startDate, item.endDate);
            const sameDay = days === 1;
            return (
              <li key={item.id}>
                <Card className="flex h-full flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={item.name} className="h-11 w-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-slate-900 dark:text-slate-50">{item.name}</p>
                      <p className="truncate text-sm text-slate-600 dark:text-slate-400">{item.detail}</p>
                    </div>
                    <Badge tone={TONE[item.status]}>{item.status === "PENDING" ? t("review.waiting") : item.status === "REJECTED" ? t("review.declined") : t(`leaveStatus.${item.status}` as MessageKey)}</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-brand-800 shadow-sm dark:bg-slate-900 dark:text-brand-200">
                      <span className="text-lg font-extrabold leading-none tabular-nums">{days}</span>
                      <span className="text-[0.65rem] font-bold uppercase">{days === 1 ? t("review.day") : t("review.days")}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-50">
                        {sameDay ? formatDay.format(new Date(item.startDate)) : `${formatDay.format(new Date(item.startDate))} – ${formatDay.format(new Date(item.endDate))}`}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {[item.kind, item.raisedBy ? t("review.reportedBy", { name: item.raisedBy }) : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>

                  {item.reason && <p className="whitespace-pre-line break-words text-sm text-slate-700 dark:text-slate-300">“{item.reason}”</p>}
                  {item.reviewNote && item.status !== "PENDING" && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-bold">{t("review.yourNote")}:</span> {item.reviewNote}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <span className="me-auto text-xs text-slate-600 dark:text-slate-400">{t("review.asked", { date: formatShort.format(new Date(item.createdAt)) })}</span>
                    {item.status === "PENDING" && (
                      <>
                        <Button
                          variant="secondary"
                          disabled={busyId === item.id}
                          onClick={() => {
                            setDeclining(item);
                            setNote("");
                            setNoteError(null);
                          }}
                        >
                          {t("review.decline")}
                        </Button>
                        <Button disabled={busyId === item.id} onClick={() => void approve(item)}>
                          {t("review.approve")}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <SidePanel open={declining !== null} title={t("review.declineTitle", { name: declining?.name ?? "" })} onClose={() => setDeclining(null)}>
        <form onSubmit={decline} noValidate className="flex flex-col gap-4">
          <Field label={t("review.reasonLabel")} help={t("review.reasonHelp")} error={noteError}>
            {(props) => <Textarea {...props} rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("review.reasonPlaceholder")} />}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={busyId !== null}>{t("review.sendDecline")}</Button>
            <Button type="button" variant="ghost" onClick={() => setDeclining(null)}>{t("common.cancel")}</Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
