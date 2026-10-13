"use client";

import { useAddComplaintComment, useComplaint, useComplaints, useUpdateComplaintStatus } from "@skolara/api-client";
import { useTranslation, type MessageKey } from "@skolara/i18n";
import type { ComplaintStatus, ComplaintSummary } from "@skolara/types";
import { Badge, Button, Card, EmptyState, Textarea, cn } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { Avatar, Field, FilterTabs, ListState, PageTitle, SidePanel } from "@/components/ui-kit";
import { intlLocale } from "@/lib/intl";
import { classLabel } from "../home-helpers";

type Filter = ComplaintStatus | "ALL";

const TONE: Record<ComplaintStatus, "warning" | "info" | "success"> = {
  OPEN: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
};

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;

function aboutLine(complaint: ComplaintSummary, t: (key: MessageKey, vars?: Record<string, string | number>) => string): string {
  const who = t(`roles.${complaint.raisedByUser.role}` as MessageKey);
  if (!complaint.student) return who;
  const child = fullName(complaint.student.user);
  const cls = complaint.student.class ? classLabel(complaint.student.class.name, complaint.student.class.section) : null;
  return t("concerns.about", { who, child: cls ? `${child} (${cls})` : child });
}

/**
 * Concerns families raise from the app. Opening one shows the whole
 * conversation; replying picks it up, and resolving tells the family.
 */
export default function ComplaintsPage() {
  const { t, locale } = useTranslation();
  const complaints = useComplaints();
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [openId, setOpenId] = useState<string | null>(null);
  const formatDate = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" });

  const all = complaints.data ?? [];
  const count = (s: Filter) => all.filter((c) => s === "ALL" || c.status === s).length;
  const shown = all.filter((c) => filter === "ALL" || c.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t("concerns.title")} subtitle={t("concerns.subtitle")} />
      <FilterTabs
        label={t("concerns.filterLabel")}
        value={filter}
        onChange={setFilter}
        options={[
          { value: "OPEN", label: t("complaintStatus.OPEN"), count: count("OPEN") },
          { value: "IN_PROGRESS", label: t("complaintStatus.IN_PROGRESS"), count: count("IN_PROGRESS") },
          { value: "RESOLVED", label: t("complaintStatus.RESOLVED") },
          { value: "ALL", label: t("common.all") },
        ]}
      />

      <Card className="p-0">
        {complaints.isError || complaints.isLoading ? (
          <ListState isError={complaints.isError} isLoading={complaints.isLoading} onRetry={() => void complaints.refetch()} errorText={t("concerns.loadError")} />
        ) : shown.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={filter === "OPEN" ? t("concerns.noneOpen") : t("concerns.noneHere")}
              description={filter === "OPEN" ? t("concerns.noneOpenBody") : undefined}
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {shown.map((complaint) => (
              <li key={complaint.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(complaint.id)}
                  className="flex w-full items-start gap-3 px-5 py-4 text-start transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-700 dark:hover:bg-slate-800/60"
                >
                  <Avatar name={fullName(complaint.raisedByUser)} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-slate-900 dark:text-slate-50">{complaint.subject}</p>
                      <Badge tone={TONE[complaint.status]}>{t(`complaintStatus.${complaint.status}`)}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{fullName(complaint.raisedByUser)}</span> · {aboutLine(complaint, t)}
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-700 dark:text-slate-300">{complaint.body}</p>
                  </div>
                  <div className="shrink-0 text-end text-xs text-slate-600 dark:text-slate-400">
                    <p>{formatDate.format(new Date(complaint.createdAt))}</p>
                    {(complaint._count?.comments ?? 0) > 0 && (
                      <p className="mt-1 font-bold">{t("concerns.replies", { count: complaint._count?.comments ?? 0 })}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SidePanel open={openId !== null} title={t("concerns.panelTitle")} onClose={() => setOpenId(null)}>
        {openId && <ConcernThread id={openId} />}
      </SidePanel>
    </div>
  );
}

function ConcernThread({ id }: { id: string }) {
  const { t, locale } = useTranslation();
  const complaint = useComplaint(id);
  const addComment = useAddComplaintComment();
  const updateStatus = useUpdateComplaintStatus();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const formatTime = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  if (complaint.isError || complaint.isLoading || !complaint.data) {
    return <ListState isError={complaint.isError} isLoading={!complaint.isError} onRetry={() => void complaint.refetch()} errorText={t("concerns.loadError")} rows={3} />;
  }
  const c = complaint.data;

  function send(event: FormEvent) {
    event.preventDefault();
    if (!reply.trim()) {
      setError(t("concerns.replyRequired"));
      return;
    }
    setError(null);
    addComment.mutate(
      { id, input: { body: reply.trim() } },
      { onSuccess: () => setReply(""), onError: (e) => setError(e instanceof Error ? e.message : t("common.somethingWentWrong")) },
    );
  }

  const next: { status: ComplaintStatus; label: MessageKey } | null =
    c.status === "OPEN" ? { status: "IN_PROGRESS", label: "complaints.markInProgress" }
    : c.status === "IN_PROGRESS" ? { status: "RESOLVED", label: "complaints.markResolved" }
    : { status: "IN_PROGRESS", label: "concerns.reopen" };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={TONE[c.status]}>{t(`complaintStatus.${c.status}`)}</Badge>
          <span className="text-xs text-slate-600 dark:text-slate-400">{formatTime.format(new Date(c.createdAt))}</span>
        </div>
        <h3 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-50">{c.subject}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-bold text-slate-700 dark:text-slate-300">{fullName(c.raisedByUser)}</span> · {aboutLine(c, t)}
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        <li className="rounded-2xl rounded-ss-sm bg-slate-100 p-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          <p className="whitespace-pre-line break-words">{c.body}</p>
        </li>
        {c.comments.map((comment) => {
          const fromSchool = comment.authorUser.role === "SCHOOL_ADMIN";
          return (
            <li
              key={comment.id}
              className={cn(
                "max-w-[90%] rounded-2xl p-3 text-sm",
                fromSchool
                  ? "ms-auto rounded-se-sm bg-brand-700 text-white"
                  : "rounded-ss-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
              )}
            >
              <p className={cn("mb-1 text-xs font-bold", fromSchool ? "text-brand-100" : "text-slate-600 dark:text-slate-400")}>
                {fullName(comment.authorUser)} · {formatTime.format(new Date(comment.createdAt))}
              </p>
              <p className="whitespace-pre-line break-words">{comment.body}</p>
            </li>
          );
        })}
      </ol>

      <form onSubmit={send} noValidate className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Field label={t("concerns.replyLabel")} help={t("concerns.replyHelp")} error={error}>
          {(props) => <Textarea {...props} rows={3} maxLength={5000} value={reply} onChange={(e) => setReply(e.target.value)} />}
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={addComment.isPending}>{addComment.isPending ? t("concerns.sending") : t("concerns.sendReply")}</Button>
          <Button
            type="button"
            variant="secondary"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id, status: next.status })}
          >
            {t(next.label)}
          </Button>
        </div>
      </form>
    </div>
  );
}
