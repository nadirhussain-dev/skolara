"use client";

import { usePaymentQueue, useReviewPayment } from "@skolara/api-client";
import type { PaymentRejectionReason, PaymentSubmissionStatus } from "@skolara/types";
import { Badge, Button, Card, Select, Skeleton, Textarea, cn } from "@skolara/ui";
import { useTranslation, type MessageKey } from "@skolara/i18n";
import { formatCurrency } from "@skolara/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { checkAmount, invoiceBalance } from "./amount-check";

const TABS: { status: PaymentSubmissionStatus; labelKey: MessageKey }[] = [
  { status: "PENDING_VERIFICATION", labelKey: "paymentQueue.tabWaiting" },
  { status: "NEEDS_INFO", labelKey: "paymentQueue.tabNeedsInfo" },
  { status: "VERIFIED", labelKey: "paymentQueue.tabVerified" },
  { status: "REJECTED", labelKey: "paymentQueue.tabRejected" },
];

const STATUS_TONE = {
  PENDING_VERIFICATION: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
  NEEDS_INFO: "info",
} as const;

const STATUS_LABEL: Record<PaymentSubmissionStatus, MessageKey> = {
  PENDING_VERIFICATION: "payments.pendingVerification",
  VERIFIED: "payments.verified",
  REJECTED: "payments.rejected",
  NEEDS_INFO: "payments.needsInfo",
};

const REJECTION_REASONS: { value: PaymentRejectionReason; labelKey: MessageKey }[] = [
  { value: "AMOUNT_MISMATCH", labelKey: "paymentQueue.reasonAmountMismatch" },
  { value: "SCREENSHOT_UNCLEAR", labelKey: "paymentQueue.reasonScreenshotUnclear" },
  { value: "WRONG_ACCOUNT", labelKey: "paymentQueue.reasonWrongAccount" },
  { value: "DUPLICATE_SUBMISSION", labelKey: "paymentQueue.reasonDuplicate" },
  { value: "OTHER", labelKey: "paymentQueue.reasonOther" },
];

type Form = "REJECT" | "NEEDS_INFO" | null;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

/**
 * The verification queue: the list on one side, the selected payment on the
 * other, so the reviewer never loses their place. Everything they would
 * otherwise work out by hand — the invoice balance, whether the amount
 * matches — is shown next to the screenshot, and the common case (it
 * matches, verify, next) is one key.
 */
export default function PaymentQueuePage() {
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PaymentSubmissionStatus>("PENDING_VERIFICATION");
  const { data, isLoading, isError, refetch } = usePaymentQueue(status);
  const review = useReviewPayment();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [rejectionReason, setRejectionReason] = useState<PaymentRejectionReason>("AMOUNT_MISMATCH");
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);

  // Waiting payments oldest first — the family that has waited longest is
  // dealt with first. Finished ones newest first, as a history.
  const submissions = useMemo(() => {
    const rows = [...(data ?? [])];
    const direction = status === "PENDING_VERIFICATION" ? 1 : -1;
    rows.sort(
      (a, b) => direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    );
    return rows;
  }, [data, status]);

  const selectedIndex = submissions.findIndex((row) => row.id === selectedId);
  const selected = submissions[selectedIndex] ?? submissions[0] ?? null;
  const pendingTotal = submissions.reduce((sum, row) => sum + Number(row.amountClaimed), 0);

  const closeForm = useCallback(() => {
    setForm(null);
    setNote("");
    setRejectionReason("AMOUNT_MISMATCH");
  }, []);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      setFailed(false);
      closeForm();
    },
    [closeForm],
  );

  const move = useCallback(
    (step: number) => {
      if (submissions.length === 0) return;
      const current = Math.max(0, selectedIndex);
      const next = Math.min(submissions.length - 1, Math.max(0, current + step));
      const row = submissions[next];
      if (row) select(row.id);
    },
    [submissions, selectedIndex, select],
  );

  const act = useCallback(
    async (input: Parameters<typeof review.mutateAsync>[0]["input"]) => {
      if (!selected) return;
      // Whoever comes after this one in the list is next once it leaves.
      const following = submissions[Math.max(0, selectedIndex) + 1] ?? null;
      setFailed(false);
      try {
        await review.mutateAsync({ id: selected.id, input });
        closeForm();
        setSelectedId(following?.id ?? null);
      } catch {
        setFailed(true);
      }
    },
    [selected, submissions, selectedIndex, review, closeForm],
  );

  const canVerify = selected?.status === "PENDING_VERIFICATION" && form === null && !review.isPending;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "j") move(1);
      else if (key === "k") move(-1);
      else if (key === "v" && canVerify) void act({ status: "VERIFIED" });
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, act, canVerify]);

  const when = (date: Date | string) =>
    new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));

  const check = selected
    ? checkAmount(
        Number(selected.amountClaimed),
        Number(selected.invoice.amountDue),
        Number(selected.invoice.amountPaid),
      )
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {t("paymentQueue.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {status !== "PENDING_VERIFICATION" || submissions.length === 0
              ? t("paymentQueue.description")
              : submissions.length === 1
                ? t("paymentQueue.waitingSummaryOne", { amount: formatCurrency(pendingTotal) })
                : t("paymentQueue.waitingSummaryMany", {
                    count: submissions.length,
                    amount: formatCurrency(pendingTotal),
                  })}
          </p>
        </div>
        <div role="tablist" className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              role="tab"
              type="button"
              aria-selected={status === tab.status}
              onClick={() => {
                setStatus(tab.status);
                setSelectedId(null);
                setFailed(false);
                closeForm();
              }}
              className={cn(
                "min-h-[2.75rem] rounded-full px-4 text-sm font-bold transition-colors",
                status === tab.status
                  ? "bg-brand-700 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
              )}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
            {t("paymentQueue.reviewFailed")}
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            {t("home.retry")}
          </Button>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5" aria-busy>
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-2xl lg:col-span-3" />
        </div>
      ) : !selected ? (
        <Card className="py-12 text-center">
          <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50">
            {status === "PENDING_VERIFICATION"
              ? t("paymentQueue.emptyWaitingTitle")
              : t("paymentQueue.nothingToReview")}
          </p>
          {status === "PENDING_VERIFICATION" && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t("paymentQueue.emptyWaitingBody")}
            </p>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-5">
          <section
            aria-label={t("paymentQueue.queueLabel")}
            className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 lg:col-span-2"
          >
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {submissions.map((row) => {
                const active = row.id === selected.id;
                const rowCheck = checkAmount(
                  Number(row.amountClaimed),
                  Number(row.invoice.amountDue),
                  Number(row.invoice.amountPaid),
                );
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      aria-current={active}
                      onClick={() => select(row.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors",
                        active
                          ? "bg-brand-50 shadow-[inset_3px_0_0_rgb(var(--brand-700))] dark:bg-brand-900/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                      )}
                    >
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-800 dark:bg-brand-900/50 dark:text-brand-100"
                      >
                        {initials(row.student.user.firstName, row.student.user.lastName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-slate-900 dark:text-slate-50">
                          {row.student.user.firstName} {row.student.user.lastName}
                        </span>
                        <span className="block truncate text-sm text-slate-600 dark:text-slate-400">
                          {when(row.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-end">
                        <span className="block font-extrabold tabular-nums text-slate-900 dark:text-slate-50">
                          {formatCurrency(Number(row.amountClaimed))}
                        </span>
                        {row.status === "PENDING_VERIFICATION" && rowCheck.kind !== "matches" && (
                          <span className="block text-xs font-bold text-warning-800 dark:text-warning-300">
                            {rowCheck.kind === "partial" ? "−" : "+"}
                            {formatCurrency(
                              rowCheck.kind === "partial" ? rowCheck.shortBy : rowCheck.overBy,
                            )}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {status === "PENDING_VERIFICATION" && (
              <p className="hidden border-t border-slate-100 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400 lg:block">
                {t("paymentQueue.shortcuts")}
              </p>
            )}
          </section>

          <section aria-label={t("paymentQueue.detailLabel")} className="lg:col-span-3">
            <Card className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">
                    {selected.student.user.firstName} {selected.student.user.lastName}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selected.student.admissionNumber} · {selected.invoice.term} ·{" "}
                    {t("paymentQueue.sent", { when: when(selected.createdAt) })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-extrabold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {selected.referenceId}
                  </span>
                  <Badge tone={STATUS_TONE[selected.status]}>{t(STATUS_LABEL[selected.status])}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <a
                  href={selected.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                >
                  {/* A parent's upload from arbitrary storage; shown at reading size. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.screenshotUrl}
                    alt={t("paymentQueue.screenshotAlt", { reference: selected.referenceId })}
                    className="h-80 w-full object-contain"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 px-3 py-1.5 text-center text-xs font-bold text-white">
                    {t("paymentQueue.openFullSize")}
                  </span>
                </a>

                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {t("paymentQueue.parentSaysPaid")}
                      </p>
                      <p className="text-2xl font-extrabold tabular-nums">
                        {formatCurrency(Number(selected.amountClaimed))}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {t("paymentQueue.invoiceBalance")}
                      </p>
                      <p className="text-2xl font-extrabold tabular-nums">
                        {formatCurrency(
                          invoiceBalance(
                            Number(selected.invoice.amountDue),
                            Number(selected.invoice.amountPaid),
                          ),
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t("paymentQueue.invoiceSummary", {
                      due: formatCurrency(Number(selected.invoice.amountDue)),
                      paid: formatCurrency(Number(selected.invoice.amountPaid)),
                    })}
                  </p>

                  {selected.status === "PENDING_VERIFICATION" && check && (
                    <p
                      className={cn(
                        "rounded-xl px-3.5 py-2.5 text-sm font-bold",
                        check.kind === "matches"
                          ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                          : "bg-warning-100 text-warning-900 dark:bg-warning-900/30 dark:text-warning-200",
                      )}
                    >
                      {check.kind === "matches"
                        ? t("paymentQueue.checkMatches")
                        : check.kind === "partial"
                          ? t("paymentQueue.checkPartial", { amount: formatCurrency(check.shortBy) })
                          : t("paymentQueue.checkOver", { amount: formatCurrency(check.overBy) })}
                    </p>
                  )}

                  {selected.reviewNote && (
                    <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm dark:bg-slate-800/60">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {t("paymentQueue.reviewNoteLabel")}
                      </p>
                      <p className="mt-0.5 text-slate-900 dark:text-slate-100">{selected.reviewNote}</p>
                    </div>
                  )}

                  {selected.receiptUrl && (
                    <a
                      href={selected.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-brand-700 underline dark:text-brand-300"
                    >
                      {t("paymentQueue.receiptPdf")}
                    </a>
                  )}
                </div>
              </div>

              {failed && (
                <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-bold text-red-800 dark:bg-red-950/50 dark:text-red-200">
                  {t("paymentQueue.reviewFailed")}
                </p>
              )}

              {selected.status === "PENDING_VERIFICATION" && form === null && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={review.isPending}
                      onClick={() => void act({ status: "VERIFIED" })}
                      className="min-h-[3rem] flex-[2] basis-52 rounded-lg bg-emerald-700 px-5 text-[0.95rem] font-extrabold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {review.isPending ? t("paymentQueue.verifying") : t("paymentQueue.verifyAndSend")}
                    </button>
                    <Button
                      variant="secondary"
                      className="min-h-[3rem] flex-1 basis-36"
                      disabled={review.isPending}
                      onClick={() => setForm("NEEDS_INFO")}
                    >
                      {t("paymentQueue.askForInfo")}
                    </Button>
                    <button
                      type="button"
                      disabled={review.isPending}
                      onClick={() => setForm("REJECT")}
                      className="min-h-[3rem] flex-1 basis-36 rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-400"
                    >
                      {t("payments.reject")}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t("paymentQueue.afterVerify")}
                  </p>
                </div>
              )}

              {form !== null && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                  {form === "REJECT" && (
                    <label className="flex flex-col gap-1.5 text-sm font-bold">
                      {t("payments.rejectionReason")}
                      <Select
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value as PaymentRejectionReason)}
                        className="max-w-sm"
                      >
                        {REJECTION_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {t(reason.labelKey)}
                          </option>
                        ))}
                      </Select>
                    </label>
                  )}
                  <label className="flex flex-col gap-1.5 text-sm font-bold">
                    {form === "REJECT"
                      ? t("paymentQueue.noteToParentOptional")
                      : t("payments.whatDoYouNeed")}
                    <Textarea
                      rows={2}
                      autoFocus
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        form === "REJECT"
                          ? t("paymentQueue.notePlaceholderReject")
                          : t("paymentQueue.notePlaceholderNeedsInfo")
                      }
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={review.isPending || (form === "NEEDS_INFO" && note.trim() === "")}
                      onClick={() =>
                        void act(
                          form === "REJECT"
                            ? { status: "REJECTED", rejectionReason, reviewNote: note || undefined }
                            : { status: "NEEDS_INFO", reviewNote: note },
                        )
                      }
                    >
                      {review.isPending
                        ? t("common.saving")
                        : form === "REJECT"
                          ? t("paymentQueue.rejectPayment")
                          : t("payments.requestMoreInfo")}
                    </Button>
                    <Button variant="ghost" onClick={closeForm}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
