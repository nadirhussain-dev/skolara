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
import { formatCurrency } from "@skolara/utils";
import { useState } from "react";

const statusTone = {
  PENDING_VERIFICATION: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
  NEEDS_INFO: "info",
} as const;

const REJECTION_REASONS: { value: PaymentRejectionReason; label: string }[] = [
  { value: "AMOUNT_MISMATCH", label: "Amount doesn't match the invoice" },
  { value: "SCREENSHOT_UNCLEAR", label: "Screenshot unclear or unreadable" },
  { value: "WRONG_ACCOUNT", label: "Paid into the wrong account" },
  { value: "DUPLICATE_SUBMISSION", label: "Duplicate submission" },
  { value: "OTHER", label: "Other" },
];

type OpenAction = { id: string; kind: "REJECT" | "NEEDS_INFO" } | null;

export default function PaymentQueuePage() {
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
      <PageHeader title="Payment queue" description="Verify parent-submitted fee payments." />
      <Card>
        <CardHeader>
          <CardTitle>Payment verification queue</CardTitle>
        </CardHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

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
                        alt={`Transfer screenshot for ${submission.referenceId}`}
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
                        Invoice: {formatCurrency(Number(submission.invoice.amountDue))} due
                        {" · "}
                        {formatCurrency(Number(submission.invoice.amountPaid))} paid so far
                      </p>
                      {submission.reviewNote && (
                        <p className="mt-1 text-xs text-amber-600">{submission.reviewNote}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={statusTone[submission.status]}>{submission.status}</Badge>
                    {submission.status === "PENDING_VERIFICATION" && !isOpen && (
                      <>
                        <Button
                          variant="primary"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({ id: submission.id, input: { status: "VERIFIED" } })
                          }
                        >
                          Verify
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setOpenAction({ id: submission.id, kind: "NEEDS_INFO" })
                          }
                        >
                          Needs info
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setOpenAction({ id: submission.id, kind: "REJECT" })}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    {openAction.kind === "REJECT" && (
                      <label className="flex flex-col gap-1 text-sm">
                        Reason
                        <Select
                          value={rejectionReason}
                          onChange={(e) =>
                            setRejectionReason(e.target.value as PaymentRejectionReason)
                          }
                          className="max-w-sm"
                        >
                          {REJECTION_REASONS.map((reason) => (
                            <option key={reason.value} value={reason.value}>
                              {reason.label}
                            </option>
                          ))}
                        </Select>
                      </label>
                    )}
                    <label className="flex flex-col gap-1 text-sm">
                      {openAction.kind === "REJECT"
                        ? "Note to the parent (optional)"
                        : "What do you need from the parent?"}
                      <Textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={
                          openAction.kind === "REJECT"
                            ? "e.g. The amount transferred was Rs. 2,000 short."
                            : "e.g. Please send a clearer screenshot showing the date."
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
                          ? "Saving..."
                          : openAction.kind === "REJECT"
                            ? "Reject payment"
                            : "Request more info"}
                      </Button>
                      <Button variant="ghost" onClick={closeAction}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {submissions?.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No payment submissions to review.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
