"use client";

import { useAuditLogs } from "@skolara/api-client";
import type { AuditOutcome, RoleType } from "@skolara/types";
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
import { useTranslation, type MessageKey } from "@skolara/i18n";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

const OUTCOME_FILTERS: { value: string; labelKey: MessageKey }[] = [
  { value: "", labelKey: "auditLog.allActivity" },
  { value: "FAILURE", labelKey: "auditLog.failuresOnly" },
  { value: "SUCCESS", labelKey: "auditLog.successesOnly" },
];

/** `SchoolsController.approve` reads better as "Schools · approve". */
function humanizeAction(action: string): string {
  const [controller, handler] = action.split(".");
  return `${controller?.replace(/Controller$/, "") ?? action} · ${handler ?? ""}`;
}

export default function AuditLogsPage() {
  const { t, locale } = useTranslation();
  const [outcome, setOutcome] = useState<"" | AuditOutcome>("");
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAuditLogs(outcome || undefined);

  const entries = data?.pages.flatMap((page) => page.entries) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("auditLog.title")}
        description={t("auditLog.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("auditLog.activity")}</CardTitle>
        </CardHeader>

        <Select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as "" | AuditOutcome)}
          className="mb-4 max-w-[200px]"
        >
          {OUTCOME_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {t(filter.labelKey)}
            </option>
          ))}
        </Select>

        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {!isLoading && entries.length === 0 && (
          <EmptyState title={t("auditLog.noActivity")} />
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
                  {entry.actorRole ? ` · ${t(`roles.${entry.actorRole as RoleType}`)}` : ""}
                  {" · "}
                  {entry.method} {entry.path}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString(intlLocale(locale))}
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
            {isFetchingNextPage ? t("common.loading") : t("auditLog.loadMore")}
          </Button>
        )}
      </Card>
    </div>
  );
}
