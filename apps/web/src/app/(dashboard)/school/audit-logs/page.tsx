"use client";

import { useAuditLogs } from "@skolara/api-client";
import type { AuditOutcome } from "@skolara/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Select,
} from "@skolara/ui";
import { useState } from "react";

const OUTCOME_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All activity" },
  { value: "FAILURE", label: "Failures only" },
  { value: "SUCCESS", label: "Successes only" },
];

/** `SchoolsController.approve` reads better as "Schools · approve". */
function humanizeAction(action: string): string {
  const [controller, handler] = action.split(".");
  return `${controller?.replace(/Controller$/, "") ?? action} · ${handler ?? ""}`;
}

export default function AuditLogsPage() {
  const [outcome, setOutcome] = useState<"" | AuditOutcome>("");
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAuditLogs(outcome || undefined);

  const entries = data?.pages.flatMap((page) => page.entries) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        description="Every change made in your school, and who made it."
      />

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>

        <Select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as "" | AuditOutcome)}
          className="mb-4 max-w-[200px]"
        >
          {OUTCOME_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </Select>

        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {!isLoading && entries.length === 0 && (
          <EmptyState title="No activity recorded yet" />
        )}

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{humanizeAction(entry.action)}</p>
                <p className="truncate text-sm text-slate-500">
                  {entry.actorUser
                    ? `${entry.actorUser.firstName} ${entry.actorUser.lastName}`
                    : entry.actorLabel}
                  {entry.actorRole ? ` · ${entry.actorRole.replace("_", " ")}` : ""}
                  {" · "}
                  {entry.method} {entry.path}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString()}
                  {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                </p>
              </div>
              <Badge tone={entry.outcome === "SUCCESS" ? "success" : "danger"}>
                {entry.statusCode}
              </Badge>
            </div>
          ))}
        </div>

        {hasNextPage && (
          <Button
            variant="secondary"
            className="mt-4 self-start"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        )}
      </Card>
    </div>
  );
}
