"use client";

import { useApiClient, useDefaulterRisk, useSchoolAnalytics } from "@skolara/api-client";
import { Badge, Button, Card, CardHeader, CardTitle, Input, PageHeader, StatCard } from "@skolara/ui";
import { useState } from "react";
import { datedFilename, saveCsv } from "@/lib/download";

const RISK_TONE = { LOW: "success", MEDIUM: "warning", HIGH: "danger" } as const;

export default function SchoolAnalyticsPage() {
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
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Overview"
          description="Enrollment, attendance, and fee-collection health at a glance."
        />
        <Button variant="secondary" onClick={downloadFeeCollection} disabled={downloadingCsv}>
          {downloadingCsv ? "Preparing..." : "Download fee collection CSV"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Students" value={data.studentCount} icon="🎓" />
        <StatCard label="Teachers" value={data.teacherCount} icon="🧑‍🏫" />
        <StatCard
          label="Attendance (30d)"
          value={`${data.attendanceRateLast30Days.toFixed(0)}%`}
          icon="✅"
        />
        <StatCard
          label="Fee collection"
          value={`${data.feeCollectionRate.toFixed(0)}%`}
          icon="💰"
        />
        <StatCard label="Payments pending" value={data.pendingPaymentSubmissions} icon="⏳" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee-defaulter risk lookup</CardTitle>
        </CardHeader>
        <div className="flex gap-3">
          <Input
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={() => setLookupId(studentId)}>Check risk</Button>
        </div>
        {riskLoading && <p className="mt-3 text-sm text-slate-500">Checking...</p>}
        {risk && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge tone={RISK_TONE[risk.riskLevel]}>{risk.riskLevel} RISK</Badge>
              <span className="text-sm text-slate-500">Score: {risk.riskScore}/100</span>
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
