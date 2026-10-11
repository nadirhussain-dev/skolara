"use client";

import { useMarkNotificationsRead, useNotifications } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { InAppNotification, RoleType } from "@skolara/types";
import { cn } from "@skolara/ui";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { intlLocale } from "@/lib/intl";
import { notificationHref, relativeTime } from "./notification-helpers";

function Row({ item, role, onOpen }: { item: InAppNotification; role: RoleType; onOpen: () => void }) {
  const { locale } = useTranslation();
  const href = notificationHref(item.data, role);
  const unread = item.readAt === null;
  const content = (
    <>
      <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", unread ? "bg-accent-500" : "bg-transparent")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm text-slate-900 dark:text-slate-50", unread ? "font-extrabold" : "font-semibold")}>{item.title}</span>
        <span className="block text-sm text-slate-600 dark:text-slate-400">{item.body}</span>
        <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">
          {relativeTime(new Date(item.createdAt), new Date(), intlLocale(locale))}
        </span>
      </span>
    </>
  );
  const className = "flex w-full gap-3 px-4 py-3 text-start hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800";
  return (
    <li>
      {href ? (
        <Link href={href} onClick={onOpen} className={className}>{content}</Link>
      ) : (
        <button type="button" onClick={onOpen} className={className}>{content}</button>
      )}
    </li>
  );
}

/** The bell in the top bar: everything Skolara has told this user, newest first. */
export function NotificationBell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const inbox = useNotifications({ enabled: Boolean(user) });
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const unread = inbox.data?.unreadCount ?? 0;
  const items = inbox.data?.items ?? [];

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? t("notifications.bellUnread", { count: unread }) : t("notifications.title")}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span aria-hidden className="absolute end-1 top-1 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-accent-500 px-1 text-[0.65rem] font-extrabold text-[#1E1B4B]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("notifications.title")}
          className="absolute end-0 top-12 z-50 flex max-h-[min(32rem,calc(100vh-5rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="font-extrabold text-slate-900 dark:text-slate-50">{t("notifications.title")}</p>
            {unread > 0 && (
              <button
                type="button"
                disabled={markRead.isPending}
                onClick={() => markRead.mutate(undefined)}
                className="min-h-[2.25rem] rounded-lg px-2 text-sm font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-brand-300 dark:hover:bg-slate-800"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>
          {inbox.isError ? (
            <p role="alert" className="px-4 py-6 text-sm font-bold text-red-700 dark:text-red-400">{t("notifications.loadError")}</p>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="font-bold text-slate-900 dark:text-slate-50">{t("notifications.emptyTitle")}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("notifications.emptyBody")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {items.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  role={user.role}
                  onOpen={() => {
                    if (item.readAt === null) markRead.mutate([item.id]);
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
