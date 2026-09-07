"use client";

import { useComplaints, useUpdateComplaintStatus } from "@skolara/api-client";
import type { ComplaintStatus } from "@skolara/types";
import { Badge, Card, CardHeader, CardTitle, PageHeader } from "@skolara/ui";
import { useTranslation, type MessageKey } from "@skolara/i18n";

const STATUS_TONE = {
  OPEN: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
} as const;

const NEXT_STATUS: Record<ComplaintStatus, ComplaintStatus | null> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED: null,
};

/**
 * The advance action, as a whole phrase per target state. "Mark " + the
 * lower-cased enum reads as English grammar assembled at runtime; a language
 * that puts the verb last can't be built that way.
 */
const ADVANCE_LABEL: Record<ComplaintStatus, MessageKey | null> = {
  OPEN: "complaints.markInProgress",
  IN_PROGRESS: "complaints.markResolved",
  RESOLVED: null,
};

export default function ComplaintsPage() {
  const { t } = useTranslation();
  const { data: complaints, isLoading } = useComplaints();
  const updateStatus = useUpdateComplaintStatus();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("complaints.title")} description={t("complaints.description")} />
      <Card>
      <CardHeader>
        <CardTitle>{t("complaints.title")}</CardTitle>
      </CardHeader>
      {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {complaints?.map((complaint) => {
          const next = NEXT_STATUS[complaint.status];
          const advanceLabel = ADVANCE_LABEL[complaint.status];
          return (
            <div key={complaint.id} className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{complaint.subject}</p>
                <p className="text-sm text-slate-500">{complaint.body}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[complaint.status]}>{t(`complaintStatus.${complaint.status}`)}</Badge>
                {next && advanceLabel && (
                  <button
                    className="text-sm text-brand-700 underline"
                    onClick={() =>
                      updateStatus.mutate({ id: complaint.id, status: next })
                    }
                  >
                    {t(advanceLabel)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {complaints?.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">{t("complaints.noComplaints")}</p>
        )}
      </div>
      </Card>
    </div>
  );
}
