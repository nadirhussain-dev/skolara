"use client";

import { useLeaveRequests, useReviewLeave } from "@skolara/api-client";
import { LEAVE_KIND_LABELS, type LeaveStatus } from "@skolara/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
} from "@skolara/ui";
import { useState } from "react";

const STATUS_TONE: Record<LeaveStatus, "warning" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

const FILTERS: (LeaveStatus | "ALL")[] = ["PENDING", "APPROVED", "REJECTED", "ALL"];

function dateRange(start: string | Date, end: string | Date): string {
  const from = new Date(start).toLocaleDateString("en-GB");
  const to = new Date(end).toLocaleDateString("en-GB");
  return from === to ? from : `${from} – ${to}`;
}

export default function LeavePage() {
  const [filter, setFilter] = useState<LeaveStatus | "ALL">("PENDING");
  const { data: requests, isLoading } = useLeaveRequests(
    filter === "ALL" ? undefined : filter,
  );
  const review = useReviewLeave();

  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function approve(id: string) {
    setError("");
    try {
      await review.mutateAsync({ id, input: { status: "APPROVED" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't approve that request");
    }
  }

  async function decline(id: string) {
    setError("");
    try {
      await review.mutateAsync({ id, input: { status: "REJECTED", reviewNote: note } });
      setDecliningId(null);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't decline that request");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staff leave"
        description="Approve or decline time-off requests. Oldest first."
      />

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                filter === option
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              {option === "ALL" ? "All" : option.charAt(0) + option.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && requests?.length === 0 && (
          <EmptyState title="Nothing to review." />
        )}
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {requests?.map((request) => (
            <li key={request.id} className="flex flex-col gap-2 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {request.requesterUser.firstName} {request.requesterUser.lastName}{" "}
                    <span className="text-slate-400">
                      ({request.requesterUser.role.replace("_", " ").toLowerCase()})
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {LEAVE_KIND_LABELS[request.kind]} ·{" "}
                    {dateRange(request.startDate, request.endDate)}
                  </p>
                  {request.reason && (
                    <p className="mt-1 text-sm text-slate-500">{request.reason}</p>
                  )}
                  {request.reviewNote && (
                    <p className="mt-1 text-xs text-amber-600">{request.reviewNote}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={STATUS_TONE[request.status]}>{request.status}</Badge>
                  {request.status === "PENDING" && decliningId !== request.id && (
                    <>
                      <Button
                        variant="primary"
                        disabled={review.isPending}
                        onClick={() => approve(request.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDecliningId(request.id);
                          setNote("");
                        }}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {decliningId === request.id && (
                <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    Reason for declining — the requester sees this
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Exams that week"
                      autoFocus
                    />
                  </label>
                  <Button
                    variant="primary"
                    disabled={!note.trim() || review.isPending}
                    onClick={() => decline(request.id)}
                  >
                    Send decline
                  </Button>
                  <Button variant="ghost" onClick={() => setDecliningId(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
