"use client";

import { usePlatformAnalytics } from "@skolara/api-client";
import { Card, CardHeader, CardTitle, PageHeader, StatCard } from "@skolara/ui";

function formatPkr(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

export default function PlatformAnalyticsPage() {
  const { data, isLoading } = usePlatformAnalytics();

  if (isLoading || !data) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform analytics"
        description="Revenue, schools, and active users across the whole Skolara platform."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="MRR"
          value={formatPkr(data.mrrPkr)}
          icon="💰"
          hint={
            data.enterpriseSchoolsExcludedFromMrr > 0
              ? `Excludes ${data.enterpriseSchoolsExcludedFromMrr} enterprise school${
                  data.enterpriseSchoolsExcludedFromMrr === 1 ? "" : "s"
                } on negotiated pricing`
              : "From active subscriptions only"
          }
        />
        <StatCard label="ARR" value={formatPkr(data.arrPkr)} icon="📈" />
        <StatCard label="Total schools" value={data.totalSchools} icon="🏫" />
        <StatCard label="Active users" value={data.totalActiveUsers} icon="👥" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label="Awaiting approval"
          value={data.pendingApprovals}
          icon="📥"
          hint={data.pendingApprovals > 0 ? "Self-serve signups to review" : "All clear"}
        />
        <StatCard
          label="Trials ending in 7 days"
          value={data.trialsEndingSoon}
          icon="⏳"
          hint="Your conversion queue"
        />
        <StatCard
          label="New schools (30 days)"
          value={data.schoolsAddedLast30Days}
          icon="✨"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schools by subscription status</CardTitle>
        </CardHeader>
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(data.schoolsByStatus).map(([status, count]) => (
            <div key={status} className="flex justify-between py-2">
              <span>{status}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schools by plan</CardTitle>
        </CardHeader>
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(data.schoolsByPlan).map(([plan, count]) => (
            <div key={plan} className="flex justify-between py-2">
              <span>{plan}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
