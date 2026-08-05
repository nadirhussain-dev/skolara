"use client";

import { useComplaints, useUpdateComplaintStatus } from "@skolara/api-client";
import type { ComplaintStatus } from "@skolara/types";
import { Badge, Card, CardHeader, CardTitle } from "@skolara/ui";

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

export default function ComplaintsPage() {
  const { data: complaints, isLoading } = useComplaints();
  const updateStatus = useUpdateComplaintStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complaints</CardTitle>
      </CardHeader>
      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {complaints?.map((complaint) => {
          const next = NEXT_STATUS[complaint.status];
          return (
            <div key={complaint.id} className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{complaint.subject}</p>
                <p className="text-sm text-slate-500">{complaint.body}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[complaint.status]}>{complaint.status}</Badge>
                {next && (
                  <button
                    className="text-sm text-brand-700 underline"
                    onClick={() =>
                      updateStatus.mutate({ id: complaint.id, status: next })
                    }
                  >
                    Mark {next.replace("_", " ").toLowerCase()}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {complaints?.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No complaints.</p>
        )}
      </div>
    </Card>
  );
}
