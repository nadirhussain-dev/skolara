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
import { useTranslation, type Translate } from "@skolara/i18n";
import { intlLocale } from "@/lib/intl";

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

/**
 * A coarse duration. Intl.RelativeTimeFormat only speaks in one unit, and
 * "3 days" loses the hours an operator wants, so the two largest units are
 * assembled from translated abbreviations.
 */
function uptime(seconds: number, t: Translate): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return t("duration.daysHours", { days, hours });
  if (hours > 0) return t("duration.hoursMinutes", { hours, minutes });
  return t("duration.minutes", { minutes });
}

export default function HealthPage() {
  const { t, locale } = useTranslation();
  const { data, isLoading, isError, dataUpdatedAt } = useHealthDetail();

  // A failed fetch is itself a health signal, so it gets the same treatment as
  // a DOWN check rather than a generic error page.
  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("health.title")} description={t("health.description")} />
        <Card>
          <div className="flex items-center gap-3">
            <Badge tone="danger">{t("health.unreachable")}</Badge>
            <p className="text-sm text-slate-500">{t("health.unreachableBody")}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("health.title")} description={t("health.description")} />
        <p className="text-sm text-slate-500">{t("common.loading")}</p>
      </div>
    );
  }

  const heapPercent = Math.round((data.memory.heapUsedMb / data.memory.heapTotalMb) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={t("health.title")} description={t("health.description")} />
        <div className="flex items-center gap-2">
          <Badge tone={CHECK_TONE[data.status]}>{t(`checkState.${data.status}`)}</Badge>
          <Badge tone="neutral">{data.environment}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t("health.uptime")} value={uptime(data.uptimeSeconds, t)} icon="⏱️" />
        <StatCard label={t("health.heap")} value={`${heapPercent}%`} icon="🧠" />
        <StatCard
          label={t("health.rss")}
          value={t("health.megabytes", { value: data.memory.rssMb })}
          icon="📈"
        />
        <StatCard label={t("health.migrations")} value={data.database.appliedMigrations} icon="🗄️" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("health.checks")}</CardTitle>
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
                    {t("health.milliseconds", { value: check.latencyMs })}
                  </span>
                )}
                <Badge tone={CHECK_TONE[check.state]}>{t(`checkState.${check.state}`)}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("health.integrations")}</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-slate-500">{t("health.integrationsBody")}</p>
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
                {t(`integrationState.${integration.state}`)}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("health.estate")}</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label={t("health.schools")} value={data.estate.schools} icon="🏫" />
          <StatCard
            label={t("health.activeOrTrialling")}
            value={data.estate.activeSchools}
            icon="✅"
          />
          <StatCard label={t("health.users")} value={data.estate.users} icon="👥" />
          <StatCard label={t("health.students")} value={data.estate.students} icon="🎓" />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("health.process")}</CardTitle>
        </CardHeader>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">{t("health.node")}</dt>
            <dd className="tabular-nums">{data.nodeVersion}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">{t("health.latestMigration")}</dt>
            <dd className="truncate">{data.database.latestMigration ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">{t("health.heap")}</dt>
            <dd className="tabular-nums">
              {t("health.heapOfTotal", {
                used: data.memory.heapUsedMb,
                total: data.memory.heapTotalMb,
              })}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">{t("health.lastChecked")}</dt>
            <dd className="tabular-nums">
              {new Date(dataUpdatedAt).toLocaleTimeString(intlLocale(locale))}
            </dd>
          </div>
        </dl>
        {/* The limit of reading live rather than sampling into a table. */}
        <p className="mt-3 text-sm text-slate-400">
          {t("health.singleProcessNote")}
        </p>
      </Card>
    </div>
  );
}
