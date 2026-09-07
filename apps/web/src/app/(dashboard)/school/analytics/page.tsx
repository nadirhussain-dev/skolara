"use client";

import { useApiClient, useDefaulterRisk, useSchoolAnalytics } from "@skolara/api-client";
import { Badge, Button, Card, CardHeader, CardTitle, Input, PageHeader, StatCard } from "@skolara/ui";
import { useTranslation, type MessageKey } from "@skolara/i18n";
import { useState } from "react";
import { datedFilename, saveCsv } from "@/lib/download";

const RISK_TONE = { LOW: "success", MEDIUM: "warning", HIGH: "danger" } as const;

/** The risk word, translated, so the badge doesn't read "HIGH RISK" in Urdu. */
const RISK_LABEL: Record<keyof typeof RISK_TONE, MessageKey> = {
  LOW: "overview.riskLow",
  MEDIUM: "overview.riskMedium",
  HIGH: "overview.riskHigh",
};

export default function SchoolAnalyticsPage() {
  const { t } = useTranslation();
  const api = useApiClient();
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  async function downloadFeeCollection() {
    setDownloadingCsv(true);
    try {
      saveCsv(await api.reports.feeCollectionCsv(), datedFilename("fee-collection"));
    } finally {
      setDownloadingCsv(false);
    }
  }

  const { data, isLoading } = useSchoolAnalytics();
  const [studentId, setStudentId] = useState("");
  const [lookupId, setLookupId] = useState<string>();
  const { data: risk, isLoading: riskLoading } = useDefaulterRisk(lookupId);

  if (isLoading || !data) {
    return <p className="text-sm text-slate-500">{t("common.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={t("overview.title")}
          description={t("overview.description")}
        />
        <Button variant="secondary" onClick={downloadFeeCollection} disabled={downloadingCsv}>
          {downloadingCsv ? t("overview.preparing") : t("overview.downloadFeeCsv")}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label={t("overview.students")} value={data.studentCount} icon="🎓" />
        <StatCard label={t("overview.teachers")} value={data.teacherCount} icon="🧑‍🏫" />
        <StatCard
          label={t("overview.attendance30d")}
          value={`${data.attendanceRateLast30Days.toFixed(0)}%`}
          icon="✅"
        />
        <StatCard
          label={t("overview.feeCollection")}
          value={`${data.feeCollectionRate.toFixed(0)}%`}
          icon="💰"
        />
        <StatCard label={t("overview.paymentsPending")} value={data.pendingPaymentSubmissions} icon="⏳" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("overview.riskLookup")}</CardTitle>
        </CardHeader>
        <div className="flex gap-3">
          <Input
            placeholder={t("overview.studentIdHint")}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={() => setLookupId(studentId)}>{t("overview.checkRisk")}</Button>
        </div>
        {riskLoading && <p className="mt-3 text-sm text-slate-500">{t("overview.checking")}</p>}
        {risk && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge tone={RISK_TONE[risk.riskLevel]}>
                {t("overview.riskBadge", { level: t(RISK_LABEL[risk.riskLevel]) })}
              </Badge>
              <span className="text-sm text-slate-500">
                {t("overview.riskScore", { score: risk.riskScore })}
              </span>
            </div>
            <ul className="list-inside list-disc text-sm text-slate-600">
              {risk.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <p className="text-sm italic text-slate-500">{risk.explanation}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
