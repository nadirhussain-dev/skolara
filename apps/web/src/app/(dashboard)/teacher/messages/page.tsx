"use client";

import { useSendMessage, useThreadMessages, useThreads, type MessageThreadWithStudent } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, EmptyState, Textarea, cn } from "@skolara/ui";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Avatar, ListState, PageTitle } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth-context";
import { intlLocale } from "@/lib/intl";
import { classLabel } from "../../school/home-helpers";

const name = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

/**
 * Parents write to their child's teachers from the app; teachers answer here
 * or in theirs. Messages stay inside Skolara — no phone numbers change hands.
 */
export default function TeacherMessagesPage() {
  const { t, locale } = useTranslation();
  const threads = useThreads();
  const [picked, setPicked] = useState<string | null>(null);
  const list = threads.data ?? [];
  const openId = picked ?? list[0]?.id ?? null;
  const open = list.find((th) => th.id === openId) ?? null;
  const formatWhen = (date: Date | string) => {
    const d = new Date(date);
    const sameDay = d.toDateString() === new Date().toDateString();
    return new Intl.DateTimeFormat(intlLocale(locale), sameDay ? { hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short" }).format(d);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t("chat.title")} subtitle={t("chat.subtitle")} />
      <Card className="overflow-hidden p-0">
        {threads.isLoading || threads.isError ? (
          <ListState isError={threads.isError} isLoading={threads.isLoading} onRetry={() => void threads.refetch()} errorText={t("chat.loadError")} />
        ) : list.length === 0 ? (
          <div className="p-5"><EmptyState title={t("chat.emptyTitle")} description={t("chat.emptyBody")} /></div>
        ) : (
          <div className="grid min-h-[34rem] grid-cols-1 md:grid-cols-[20rem_minmax(0,1fr)]">
            <ul aria-label={t("chat.conversations")} className="max-h-[40rem] overflow-y-auto border-b border-slate-200 md:border-b-0 md:border-e dark:border-slate-800">
              {list.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    aria-current={thread.id === openId ? "true" : undefined}
                    onClick={() => setPicked(thread.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-700",
                      thread.id === openId ? "bg-brand-50 dark:bg-brand-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                    )}
                  >
                    <Avatar name={name(thread.parentUser)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-bold text-slate-900 dark:text-slate-50">{name(thread.parentUser)}</span>
                        {thread.lastMessage && <span className="shrink-0 text-xs text-slate-600 dark:text-slate-400">{formatWhen(thread.lastMessage.createdAt)}</span>}
                      </span>
                      <span className="block truncate text-xs font-bold text-brand-700 dark:text-brand-300">{aboutChild(thread, t)}</span>
                      <span className="block truncate text-sm text-slate-600 dark:text-slate-400">{thread.lastMessage?.body ?? t("chat.noMessagesYet")}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {open && <Conversation key={open.id} thread={open} />}
          </div>
        )}
      </Card>
    </div>
  );
}

function aboutChild(thread: MessageThreadWithStudent, t: ReturnType<typeof useTranslation>["t"]) {
  const cls = thread.student.class ? ` · ${classLabel(thread.student.class.name, thread.student.class.section)}` : "";
  return t("chat.about", { child: name(thread.student.user) }) + cls;
}

function Conversation({ thread }: { thread: MessageThreadWithStudent }) {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const messages = useThreadMessages(thread.id);
  const send = useSendMessage();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const time = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const count = messages.data?.length ?? 0;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setError(null);
    send.mutate({ threadId: thread.id, input: { body } }, {
      onSuccess: () => setDraft(""),
      onError: (e) => setError(e instanceof Error ? e.message : t("common.somethingWentWrong")),
    });
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter starts a new line.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <section aria-label={name(thread.parentUser)} className="flex min-h-[34rem] flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <Avatar name={name(thread.parentUser)} />
        <div className="min-w-0">
          <h2 className="truncate font-extrabold text-slate-900 dark:text-slate-50">{name(thread.parentUser)}</h2>
          <p className="truncate text-sm text-slate-600 dark:text-slate-400">{aboutChild(thread, t)}</p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-4 dark:bg-slate-950/40" aria-live="polite">
        {messages.isLoading ? (
          <ListState isError={false} isLoading onRetry={() => undefined} errorText="" rows={3} />
        ) : count === 0 ? (
          <p className="py-10 text-center text-sm text-slate-600 dark:text-slate-400">{t("chat.startHint")}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {(messages.data ?? []).map((message) => {
              const mine = message.senderId === user?.id;
              return (
                <li key={message.id} className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", mine ? "ms-auto rounded-ee-sm bg-brand-700 text-white" : "me-auto rounded-es-sm bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-50")}>
                  <p className="whitespace-pre-line break-words">{message.body}</p>
                  <p className={cn("mt-1 text-[0.7rem]", mine ? "text-brand-100" : "text-slate-500 dark:text-slate-400")}>{time.format(new Date(message.createdAt))}</p>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <label htmlFor="chat-draft" className="sr-only">{t("chat.writeLabel")}</label>
        <Textarea id="chat-draft" rows={2} maxLength={4000} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder={t("chat.placeholder")} className="min-h-[2.75rem] resize-none" />
        <Button type="submit" disabled={send.isPending || !draft.trim()}>{t("chat.send")}</Button>
      </form>
      {error && <p role="alert" className="px-3 pb-3 text-sm font-bold text-red-700 dark:text-red-400">{error}</p>}
    </section>
  );
}
