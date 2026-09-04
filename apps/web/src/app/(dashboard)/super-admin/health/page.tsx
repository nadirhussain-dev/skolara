"use client";

import { useHealthDetail } from "@skolara/api-client";
import type { CheckState, IntegrationState } from "@skolara/types";
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
} from "@skolara/ui";

const CHECK_TONE: Record<CheckState, "success" | "warning" | "danger"> = {
  OK: "success",
  DEGRADED: "warning",
  DOWN: "danger",
};

const INTEGRATION_TONE: Record<IntegrationState, "success" | "warning" | "neutral"> = {
  LIVE: "success",
  // A stub isn't broken in development and is broken in production, so it
  // reads as a warning rather than as either.
  STUB: "warning",
  OFF: "neutral",
};

function uptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function HealthPage() {
  const { data, isLoading, isError, dataUpdatedAt } = useHealthDetail();

  // A failed fetch is itself a health signal, so it gets the same treatment as
  // a DOWN check rather than a generic error page.
  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Infrastructure" description="Live status of the API and its estate." />
        <Card>
          <div className="flex items-center gap-3">
            <Badge tone="danger">Unreachable</Badge>
            <p className="text-sm text-slate-500">
              The API didn&apos;t answer. It is either down, or up and unable to serve this
              endpoint.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Infrastructure" description="Live status of the API and its estate." />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  const heapPercent = Math.round((data.memory.heapUsedMb / data.memory.heapTotalMb) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Infrastructure" description="Live status of the API and its estate." />
        <div className="flex items-center gap-2">
          <Badge tone={CHECK_TONE[data.status]}>{data.status}</Badge>
          <Badge tone="neutral">{data.environment}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Uptime" value={uptime(data.uptimeSeconds)} icon="⏱️" />
        <StatCard label="Heap" value={`${heapPercent}%`} icon="🧠" />
        <StatCard label="RSS" value={`${data.memory.rssMb} MB`} icon="📈" />
        <StatCard label="Migrations" value={data.database.appliedMigrations} icon="🗄️" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checks</CardTitle>
        </CardHeader>
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {data.checks.map((check) => (
            <li key={check.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{check.label}</p>
                {check.detail && <p className="mt-1 text-sm text-slate-500">{check.detail}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {check.latencyMs !== undefined && (
                  <span className="text-sm tabular-nums text-slate-500">
                    {check.latencyMs} ms
                  </span>
                )}
                <Badge tone={CHECK_TONE[check.state]}>{check.state}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-slate-500">
          Everything optional falls back to a console or local-disk stub when unconfigured. That is
          what makes a clean checkout run end to end — and what makes an unconfigured production
          deploy silently wrong.
        </p>
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {data.integrations.map((integration) => (
            <li
              key={integration.key}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-medium">{integration.label}</p>
                <p className="mt-1 text-sm text-slate-500">{integration.detail}</p>
              </div>
              <Badge tone={INTEGRATION_TONE[integration.state]} className="shrink-0">
                {integration.state}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estate</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Schools" value={data.estate.schools} icon="🏫" />
          <StatCard label="Active or trialling" value={data.estate.activeSchools} icon="✅" />
          <StatCard label="Users" value={data.estate.users} icon="👥" />
          <StatCard label="Students" value={data.estate.students} icon="🎓" />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Process</CardTitle>
        </CardHeader>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Node</dt>
            <dd className="tabular-nums">{data.nodeVersion}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Latest migration</dt>
            <dd className="truncate">{data.database.latestMigration ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Heap</dt>
            <dd className="tabular-nums">
              {data.memory.heapUsedMb} / {data.memory.heapTotalMb} MB
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Last checked</dt>
            <dd className="tabular-nums">
              {new Date(dataUpdatedAt).toLocaleTimeString("en-GB")}
            </dd>
          </div>
        </dl>
        {/* The limit of reading live rather than sampling into a table. */}
        <p className="mt-3 text-sm text-slate-400">
          These figures describe the single process that answered this request. Behind more than
          one instance, that is whichever one the load balancer picked.
        </p>
      </Card>
    </div>
  );
}
