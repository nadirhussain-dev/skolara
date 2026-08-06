"use client";

import { useDefaulterRisk, useSchoolAnalytics } from "@skolara/api-client";
import { Badge, Button, Card, CardHeader, CardTitle, Input, StatCard } from "@skolara/ui";
import { useState } from "react";

const RISK_TONE = { LOW: "success", MEDIUM: "warning", HIGH: "danger" } as const;

export default function SchoolAnalyticsPage() {
  const { data, isLoading } = useSchoolAnalytics();
  const [studentId, setStudentId] = useState("");
  const [lookupId, setLookupId] = useState<string>();
  const { data: risk, isLoading: riskLoading } = useDefaulterRisk(lookupId);

  if (isLoading || !data) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Students" value={data.studentCount} />
        <StatCard label="Teachers" value={data.teacherCount} />
        <StatCard
          label="Attendance (30d)"
          value={`${data.attendanceRateLast30Days.toFixed(0)}%`}
        />
        <StatCard label="Fee collection" value={`${data.feeCollectionRate.toFixed(0)}%`} />
        <StatCard label="Payments pending" value={data.pendingPaymentSubmissions} />
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
