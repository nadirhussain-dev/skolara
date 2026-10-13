"use client";

import { useAbsenceRequests, useReviewAbsence } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { RequestReview } from "@/components/request-review";
import { classLabel } from "../home-helpers";

/**
 * Absences families report ahead of time. Approving one marks those days as
 * excused on the register, including registers already taken.
 */
export default function AbsencesPage() {
  const { t } = useTranslation();
  const requests = useAbsenceRequests();
  const review = useReviewAbsence();

  return (
    <RequestReview
      title={t("absences.title")}
      subtitle={t("absences.description")}
      isLoading={requests.isLoading}
      isError={requests.isError}
      onRetry={() => void requests.refetch()}
      loadError={t("review.loadError")}
      items={requests.data?.map((request) => ({
        id: request.id,
        status: request.status,
        name: `${request.student.user.firstName} ${request.student.user.lastName}`,
        detail: t("absences.classLine", {
          className: request.student.class ? classLabel(request.student.class.name, request.student.class.section) : t("review.noClass"),
          admissionNumber: request.student.admissionNumber,
        }),
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        reviewNote: request.reviewNote,
        createdAt: request.createdAt,
        raisedBy: `${request.raisedByUser.firstName} ${request.raisedByUser.lastName}`,
      }))}
      onApprove={async (id) => {
        // Says what actually changed: approving a past absence rewrites
        // registers, approving a future one doesn't yet.
        const result = await review.mutateAsync({ id, input: { status: "APPROVED" } });
        return result.excusedRecords === 0
          ? t("absences.excusedNone")
          : result.excusedRecords === 1
            ? t("absences.excusedOne")
            : t("absences.excusedMany", { count: result.excusedRecords });
      }}
      onDecline={async (id, note) => {
        await review.mutateAsync({ id, input: { status: "REJECTED", reviewNote: note } });
      }}
    />
  );
}
