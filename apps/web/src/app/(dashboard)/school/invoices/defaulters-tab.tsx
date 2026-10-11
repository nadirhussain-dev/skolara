"use client";

import { useDefaulters, useSendFeeReminders } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Button, Card, EmptyState, Skeleton, cn } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import Link from "next/link";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";
import { classLabel } from "../home-helpers";

export function DefaultersTab() {
  const { t, locale } = useTranslation();
  const defaulters = useDefaulters();
  const remind = useSendFeeReminders();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const dateFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" });

  if (defaulters.isError) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{t("fees.loadError")}</p>
        <Button variant="secondary" onClick={() => void defaulters.refetch()}>{t("common.retry")}</Button>
      </Card>
    );
  }
  if (!defaulters.data) {
    return <Card className="flex flex-col gap-3" aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</Card>;
  }
  if (defaulters.data.length === 0) {
    return <Card><EmptyState title={t("fees.defaultersEmptyTitle")} description={t("fees.defaultersEmptyBody")} /></Card>;
  }

  const reachable = defaulters.data.filter((d) => d.parentCount > 0);
  const allSelected = reachable.length > 0 && reachable.every((d) => selected.has(d.studentId));
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function send() {
    setMessage(null);
    remind.mutate([...selected], {
      onSuccess: (result) => {
        setSelected(new Set());
        setMessage({
          tone: "ok",
          text:
            result.withoutParent > 0
              ? t("fees.reminderSentSome", { count: result.reminded, missing: result.withoutParent })
              : t("fees.reminderSent", { count: result.reminded }),
        });
      },
      onError: () => setMessage({ tone: "error", text: t("fees.reminderError") }),
    });
  }

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 text-sm font-bold text-slate-900 dark:text-slate-50">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={reachable.length === 0}
            onChange={() => setSelected(allSelected ? new Set() : new Set(reachable.map((d) => d.studentId)))}
            className="h-5 w-5 rounded accent-[rgb(var(--brand-700))]"
          />
          {selected.size > 0 ? t("fees.selected", { count: selected.size }) : t("fees.selectAll")}
        </label>
        <Button variant="accent" disabled={selected.size === 0 || remind.isPending} onClick={send}>
          {remind.isPending ? t("fees.sending") : t("fees.sendReminder")}
        </Button>
      </div>
      <p role="status" aria-live="polite" className={cn("px-4 pt-3 text-sm font-bold", message?.tone === "error" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400", !message && "sr-only")}>
        {message?.text}
      </p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {defaulters.data.map((d) => (
          <li key={d.studentId} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
            <input
              type="checkbox"
              aria-label={t("fees.selectStudent", { name: d.studentName })}
              checked={selected.has(d.studentId)}
              disabled={d.parentCount === 0}
              onChange={() => toggle(d.studentId)}
              className="h-5 w-5 rounded accent-[rgb(var(--brand-700))] disabled:opacity-40"
            />
            <div className="min-w-0 flex-1 basis-56">
              <Link href={`/school/students/${d.studentId}`} className="font-extrabold text-slate-900 hover:text-brand-700 hover:underline dark:text-slate-50 dark:hover:text-brand-300">
                {d.studentName}
              </Link>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {d.className ? classLabel(d.className, d.classSection) : t("fees.noClass")} · {d.admissionNumber} ·{" "}
                {d.overdueInvoiceCount === 1 ? t("fees.invoicesCountOne") : t("fees.invoicesCount", { count: d.overdueInvoiceCount })} ·{" "}
                {t("fees.lateSince", { date: dateFormat.format(new Date(d.oldestDueDate)) })}
              </p>
              {d.parentCount === 0 && <p className="text-sm font-bold text-red-700 dark:text-red-400">{t("fees.noParentLinked")}</p>}
            </div>
            <div className="text-end">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{t("fees.owes")}</p>
              <p className="text-lg font-extrabold tabular-nums text-red-700 dark:text-red-400">{formatCurrency(d.overdueAmount)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">{t("fees.reminderNote")}</p>
    </Card>
  );
}
