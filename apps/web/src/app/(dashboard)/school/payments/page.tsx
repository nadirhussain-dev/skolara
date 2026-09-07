"use client";

import { useReviewPayment, usePaymentQueue } from "@skolara/api-client";
import type { PaymentRejectionReason } from "@skolara/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Select,
  Textarea,
  PageHeader,
} from "@skolara/ui";
import { useTranslation, type MessageKey } from "@skolara/i18n";
import { formatCurrency } from "@skolara/utils";
import { useState } from "react";

const statusTone = {
  PENDING_VERIFICATION: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
  NEEDS_INFO: "info",
} as const;

const REJECTION_REASONS: { value: PaymentRejectionReason; labelKey: MessageKey }[] = [
  { value: "AMOUNT_MISMATCH", labelKey: "paymentQueue.reasonAmountMismatch" },
  { value: "SCREENSHOT_UNCLEAR", labelKey: "paymentQueue.reasonScreenshotUnclear" },
  { value: "WRONG_ACCOUNT", labelKey: "paymentQueue.reasonWrongAccount" },
  { value: "DUPLICATE_SUBMISSION", labelKey: "paymentQueue.reasonDuplicate" },
  { value: "OTHER", labelKey: "paymentQueue.reasonOther" },
];

/** The queue's four states, as the catalogue already names them. */
const STATUS_LABEL: Record<keyof typeof statusTone, MessageKey> = {
  PENDING_VERIFICATION: "payments.pendingVerification",
  VERIFIED: "payments.verified",
  REJECTED: "payments.rejected",
  NEEDS_INFO: "payments.needsInfo",
};

type OpenAction = { id: string; kind: "REJECT" | "NEEDS_INFO" } | null;

export default function PaymentQueuePage() {
  const { t } = useTranslation();
  const { data: submissions, isLoading } = usePaymentQueue();
  const review = useReviewPayment();

  // Which row has its reject / needs-info form expanded. Only one at a time:
  // this is a queue worked top to bottom, not a bulk-edit surface.
  const [openAction, setOpenAction] = useState<OpenAction>(null);
  const [rejectionReason, setRejectionReason] =
    useState<PaymentRejectionReason>("AMOUNT_MISMATCH");
  const [note, setNote] = useState("");

  function closeAction() {
    setOpenAction(null);
    setRejectionReason("AMOUNT_MISMATCH");
    setNote("");
  }

  async function submitAction(id: string, kind: "REJECT" | "NEEDS_INFO") {
    if (kind === "REJECT") {
      await review.mutateAsync({
        id,
        input: { status: "REJECTED", rejectionReason, reviewNote: note || undefined },
      });
    } else {
      await review.mutateAsync({ id, input: { status: "NEEDS_INFO", reviewNote: note } });
    }
    closeAction();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("paymentQueue.title")} description={t("paymentQueue.description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("paymentQueue.cardTitle")}</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {submissions?.map((submission) => {
            const isOpen = openAction?.id === submission.id;
            return (
              <div key={submission.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* The screenshot is the whole point of the review — show it
                        inline rather than making the admin open a tab per row. */}
                    <a
                      href={submission.screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={submission.screenshotUrl}
                        alt={t("paymentQueue.screenshotAlt", { reference: submission.referenceId })}
                        className="h-20 w-20 rounded-lg border border-slate-200 object-cover dark:border-slate-800"
                      />
                    </a>
                    <div>
                      <p className="font-medium">
                        {submission.student.user.firstName}{" "}
                        {submission.student.user.lastName}{" "}
                        <span className="text-slate-400">
                          ({submission.student.admissionNumber})
                        </span>
                      </p>
                      <p className="text-sm text-slate-500">
                        {submission.referenceId} ·{" "}
                        {formatCurrency(Number(submission.amountClaimed))} ·{" "}
                        {submission.invoice.term}
                      </p>
                      <p className="text-sm text-slate-500">
                        {t("paymentQueue.invoiceSummary", {
                          due: formatCurrency(Number(submission.invoice.amountDue)),
                          paid: formatCurrency(Number(submission.invoice.amountPaid)),
                        })}
                      </p>
                      {submission.reviewNote && (
                        <p className="mt-1 text-xs text-amber-600">{submission.reviewNote}</p>
                      )}
                      {submission.receiptUrl && (
                        <a
                          href={submission.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-brand-700 underline"
                        >
                          {t("paymentQueue.receiptPdf")}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={statusTone[submission.status]}>{t(STATUS_LABEL[submission.status])}</Badge>
                    {submission.status === "PENDING_VERIFICATION" && !isOpen && (
                      <>
                        <Button
                          variant="primary"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({ id: submission.id, input: { status: "VERIFIED" } })
                          }
                        >
                          {t("payments.verify")}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setOpenAction({ id: submission.id, kind: "NEEDS_INFO" })
                          }
                        >
                          {t("payments.needsInfo")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setOpenAction({ id: submission.id, kind: "REJECT" })}
                        >
                          {t("payments.reject")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    {openAction.kind === "REJECT" && (
                      <label className="flex flex-col gap-1 text-sm">
                        {t("payments.rejectionReason")}
                        <Select
                          value={rejectionReason}
                          onChange={(e) =>
                            setRejectionReason(e.target.value as PaymentRejectionReason)
                          }
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
                    <label className="flex flex-col gap-1 text-sm">
                      {openAction.kind === "REJECT"
                        ? t("paymentQueue.noteToParentOptional")
                        : t("payments.whatDoYouNeed")}
                      <Textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={
                          openAction.kind === "REJECT"
                            ? t("paymentQueue.notePlaceholderReject")
                            : t("paymentQueue.notePlaceholderNeedsInfo")
                        }
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        disabled={
                          review.isPending ||
                          (openAction.kind === "NEEDS_INFO" && note.trim() === "")
                        }
                        onClick={() => submitAction(submission.id, openAction.kind)}
                      >
                        {review.isPending
                          ? t("common.saving")
                          : openAction.kind === "REJECT"
                            ? t("paymentQueue.rejectPayment")
                            : t("payments.requestMoreInfo")}
                      </Button>
                      <Button variant="ghost" onClick={closeAction}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {submissions?.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              {t("paymentQueue.nothingToReview")}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
