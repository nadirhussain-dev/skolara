"use client";

import { useReviewPayment, usePaymentQueue } from "@skolara/api-client";
import type { PaymentRejectionReason } from "@skolara/types";
import { Badge, Button, Card, CardHeader, CardTitle, PageHeader } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";

const statusTone = {
  PENDING_VERIFICATION: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
  NEEDS_INFO: "info",
} as const;

export default function PaymentQueuePage() {
  const { data: submissions, isLoading } = usePaymentQueue();
  const review = useReviewPayment();

  function verify(id: string) {
    review.mutate({ id, input: { status: "VERIFIED" } });
  }

  function reject(id: string) {
    const rejectionReason = window.prompt(
      "Rejection reason (AMOUNT_MISMATCH, SCREENSHOT_UNCLEAR, WRONG_ACCOUNT, DUPLICATE_SUBMISSION, OTHER):",
      "AMOUNT_MISMATCH",
    ) as PaymentRejectionReason | null;
    if (!rejectionReason) return;
    review.mutate({ id, input: { status: "REJECTED", rejectionReason } });
  }

  function needsInfo(id: string) {
    const reviewNote = window.prompt("What info is needed from the parent?");
    if (!reviewNote) return;
    review.mutate({ id, input: { status: "NEEDS_INFO", reviewNote } });
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
        {submissions?.map((submission) => (
          <div key={submission.id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">
                {submission.student.user.firstName}{" "}
                {submission.student.user.lastName}{" "}
                <span className="text-slate-400">
                  ({submission.student.admissionNumber})
                </span>
              </p>
              <p className="text-sm text-slate-500">
                {submission.referenceId} · {formatCurrency(Number(submission.amountClaimed))}{" "}
                · {submission.invoice.term}
              </p>
              {submission.reviewNote && (
                <p className="mt-1 text-xs text-amber-600">{submission.reviewNote}</p>
              )}
              <a
                href={submission.screenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-700 underline"
              >
                View screenshot
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone[submission.status]}>{submission.status}</Badge>
              {submission.status === "PENDING_VERIFICATION" && (
                <>
                  <Button variant="primary" onClick={() => verify(submission.id)}>
                    Verify
                  </Button>
                  <Button variant="secondary" onClick={() => needsInfo(submission.id)}>
                    Needs info
                  </Button>
                  <Button variant="ghost" onClick={() => reject(submission.id)}>
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
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
