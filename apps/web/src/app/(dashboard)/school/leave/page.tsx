"use client";

import { useLeaveRequests, useReviewLeave } from "@skolara/api-client";
import { useTranslation, type MessageKey } from "@skolara/i18n";
import { RequestReview } from "@/components/request-review";

/** Staff time off: teachers ask in the app, the office decides here. */
export default function LeavePage() {
  const { t } = useTranslation();
  const requests = useLeaveRequests();
  const review = useReviewLeave();

  return (
    <RequestReview
      title={t("leave.title")}
      subtitle={t("leave.description")}
      isLoading={requests.isLoading}
      isError={requests.isError}
      onRetry={() => void requests.refetch()}
      loadError={t("review.loadError")}
      items={requests.data?.map((request) => ({
        id: request.id,
        status: request.status,
        name: `${request.requesterUser.firstName} ${request.requesterUser.lastName}`,
        detail: t(`roles.${request.requesterUser.role}` as MessageKey),
        kind: t(`leaveKind.${request.kind}`),
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        reviewNote: request.reviewNote,
        createdAt: request.createdAt,
      }))}
      onApprove={async (id) => {
        await review.mutateAsync({ id, input: { status: "APPROVED" } });
        return t("review.approvedSent");
      }}
      onDecline={async (id, note) => {
        await review.mutateAsync({ id, input: { status: "REJECTED", reviewNote: note } });
      }}
    />
  );
}
