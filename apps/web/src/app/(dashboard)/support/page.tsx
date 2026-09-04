"use client";

import {
  useAddSupportComment,
  useCreateSupportTicket,
  useSupportTicket,
  useSupportTickets,
  useUpdateSupportTicket,
} from "@skolara/api-client";
import {
  supportTicketPrioritySchema,
  supportTicketStatusSchema,
  type SupportTicketPriority,
  type SupportTicketStatus,
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
  Textarea,
} from "@skolara/ui";
import { useTranslation } from "@skolara/i18n";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";
import { useAuth } from "@/lib/auth-context";

const STATUS_TONE: Record<SupportTicketStatus, "warning" | "info" | "success" | "neutral"> = {
  OPEN: "warning",
  IN_PROGRESS: "info",
  WAITING_ON_SCHOOL: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const PRIORITY_TONE: Record<SupportTicketPriority, "neutral" | "info" | "warning" | "danger"> = {
  LOW: "neutral",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export default function SupportPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const isPlatform = user?.role === "SUPER_ADMIN";

  const { data: tickets, isLoading } = useSupportTickets();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("support.title")}
        description={
          isPlatform
            ? t("support.descriptionPlatform")
            : t("support.descriptionSchool")
        }
      />

      {!isPlatform && <RaiseTicket />}

      <Card>
        <CardHeader>
          <CardTitle>{t("support.tickets")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {!isLoading && tickets?.length === 0 && (
          <EmptyState
            title={
              isPlatform ? t("support.noTicketsPlatform") : t("support.noTicketsSchool")
            }
          />
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {tickets?.map((ticket) => (
            <li key={ticket.id} className="py-3">
              <button
                type="button"
                onClick={() => setOpenId(openId === ticket.id ? null : ticket.id)}
                className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
              >
                <div>
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="text-sm text-slate-500">
                    {isPlatform ? `${ticket.school.name} · ` : ""}
                    {t("support.ticketMeta", {
                      author: `${ticket.raisedByUser.firstName} ${ticket.raisedByUser.lastName}`,
                      date: new Date(ticket.createdAt).toLocaleDateString(intlLocale(locale)),
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={PRIORITY_TONE[ticket.priority]}>{t(`ticketPriority.${ticket.priority}`)}</Badge>
                  <Badge tone={STATUS_TONE[ticket.status]}>{t(`ticketStatus.${ticket.status}`)}</Badge>
                </div>
              </button>
              {openId === ticket.id && <TicketThread id={ticket.id} isPlatform={isPlatform} />}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function RaiseTicket() {
  const { t } = useTranslation();
  const create = useCreateSupportTicket();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("NORMAL");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await create.mutateAsync({ subject, body, priority });
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("support.couldNotRaise"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("support.raiseTicket")}</CardTitle>
      </CardHeader>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder={t("fields.subject")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            minLength={3}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {supportTicketPrioritySchema.options.map((option) => (
              <option key={option} value={option}>
                {t(`ticketPriority.${option}`)}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          placeholder={t("support.bodyHint")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          required
          minLength={10}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? t("support.sending") : t("support.raise")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function TicketThread({ id, isPlatform }: { id: string; isPlatform: boolean }) {
  const { t } = useTranslation();
  const { data: ticket } = useSupportTicket(id);
  const addComment = useAddSupportComment();
  const update = useUpdateSupportTicket();

  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);

  if (!ticket) return <p className="mt-3 text-sm text-slate-500">{t("common.loading")}</p>;

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
      <p className="whitespace-pre-wrap text-sm">{ticket.body}</p>

      {ticket.comments.map((comment) => (
        <div
          key={comment.id}
          className={`rounded-md border p-3 text-sm ${
            comment.internal
              ? "border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30"
              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
          }`}
        >
          <p className="mb-1 text-xs text-slate-500">
            {comment.authorUser.firstName} {comment.authorUser.lastName}
            {comment.internal ? t("support.internalNoteSuffix") : ""}
          </p>
          <p className="whitespace-pre-wrap">{comment.body}</p>
        </div>
      ))}

      {ticket.status !== "CLOSED" && (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder={t("support.replyHint")}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={!reply.trim() || addComment.isPending}
              onClick={async () => {
                await addComment.mutateAsync({ id, input: { body: reply, internal } });
                setReply("");
                setInternal(false);
              }}
            >
              {t("support.send")}
            </Button>
            {isPlatform && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t("support.internalNoteLabel")}
                </label>
                <select
                  value={ticket.status}
                  onChange={(e) =>
                    update.mutate({
                      id,
                      input: { status: e.target.value as SupportTicketStatus },
                    })
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  {supportTicketStatusSchema.options.map((option) => (
                    <option key={option} value={option}>
                      {t(`ticketStatus.${option}`)}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
