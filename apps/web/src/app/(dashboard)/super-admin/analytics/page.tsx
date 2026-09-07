"use client";

import { useApiClient, usePlatformAnalytics } from "@skolara/api-client";
import { Button, Card, CardHeader, CardTitle, PageHeader, StatCard } from "@skolara/ui";
import { useTranslation, type Locale, type MessageKey } from "@skolara/i18n";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";
import { datedFilename, saveCsv } from "@/lib/download";

function formatPkr(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PlatformAnalyticsPage() {
  const { t, locale } = useTranslation();
  const { data, isLoading } = usePlatformAnalytics();
  const api = useApiClient();
  const [downloading, setDownloading] = useState(false);

  async function downloadRevenue() {
    setDownloading(true);
    try {
      saveCsv(await api.reports.platformRevenueCsv(), datedFilename("platform-revenue"));
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading || !data) {
    return <p className="text-sm text-slate-500">{t("common.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={t("platformAnalytics.title")}
          description={t("platformAnalytics.description")}
        />
        <Button variant="secondary" onClick={downloadRevenue} disabled={downloading}>
          {downloading ? t("platformAnalytics.preparing") : t("platformAnalytics.downloadRevenueCsv")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t("platformAnalytics.mrr")}
          value={formatPkr(data.mrrPkr, locale)}
          icon="💰"
          hint={
            data.enterpriseSchoolsExcludedFromMrr > 0
              ? t(
                  data.enterpriseSchoolsExcludedFromMrr === 1
                    ? "platformAnalytics.excludesEnterprise"
                    : "platformAnalytics.excludesEnterprisePlural",
                  { count: data.enterpriseSchoolsExcludedFromMrr },
                )
              : t("platformAnalytics.fromActiveOnly")
          }
        />
        <StatCard label={t("platformAnalytics.arr")} value={formatPkr(data.arrPkr, locale)} icon="📈" />
        <StatCard label={t("platformAnalytics.totalSchools")} value={data.totalSchools} icon="🏫" />
        <StatCard label={t("platformAnalytics.activeUsers")} value={data.totalActiveUsers} icon="👥" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label={t("platformAnalytics.awaitingApproval")}
          value={data.pendingApprovals}
          icon="📥"
          hint={
            data.pendingApprovals > 0
              ? t("platformAnalytics.signupsToReview")
              : t("platformAnalytics.allClear")
          }
        />
        <StatCard
          label={t("platformAnalytics.trialsEnding")}
          value={data.trialsEndingSoon}
          icon="⏳"
          hint={t("platformAnalytics.conversionQueue")}
        />
        <StatCard
          label={t("platformAnalytics.newSchools30d")}
          value={data.schoolsAddedLast30Days}
          icon="✨"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("platformAnalytics.byStatus")}</CardTitle>
        </CardHeader>
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(data.schoolsByStatus).map(([status, count]) => (
            <div key={status} className="flex justify-between py-2">
              <span>{t(`subscriptionStatus.${status}` as MessageKey)}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("platformAnalytics.byPlan")}</CardTitle>
        </CardHeader>
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(data.schoolsByPlan).map(([plan, count]) => (
            <div key={plan} className="flex justify-between py-2">
              <span>{t(`plans.${plan}` as MessageKey)}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
