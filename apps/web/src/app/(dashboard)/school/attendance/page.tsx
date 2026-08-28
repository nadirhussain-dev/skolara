"use client";

import { useSchoolDayAttendance } from "@skolara/api-client";
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  StatCard,
} from "@skolara/ui";
import { useState } from "react";

function todayIso(): string {
  // `toISOString` would shift the date across midnight for anyone east of UTC,
  // which for a Pakistan-first product is every user.
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${rate.toFixed(1)}%`;
}

export default function SchoolAttendancePage() {
  const [date, setDate] = useState(todayIso);
  const { data, isLoading } = useSchoolDayAttendance(date);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        description="School-wide register status for a single day."
      />

      <Card>
        <label className="flex max-w-[220px] flex-col gap-1 text-sm">
          Date
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </Card>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Attendance rate" value={formatRate(data.attendanceRate)} />
            <StatCard
              label="Present"
              value={`${data.presentCount} / ${data.totalCount}`}
            />
            <StatCard
              label="Registers not taken"
              value={String(data.unmarkedClassCount)}
              hint={
                data.unmarkedClassCount > 0
                  ? "Chase these teachers before the day ends"
                  : "Every class marked"
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>By class</CardTitle>
            </CardHeader>

            {data.classes.length === 0 && <EmptyState title="No classes set up yet" />}

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {data.classes.map((entry) => (
                <div
                  key={entry.classId}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium">
                      {entry.name}
                      {entry.section ? ` · ${entry.section}` : ""}
                    </p>
                    <p className="text-sm text-slate-500">
                      {entry.marked
                        ? `${entry.presentCount} of ${entry.totalCount} present`
                        : "Register not taken"}
                    </p>
                  </div>
                  {entry.marked ? (
                    <Badge tone={(entry.attendanceRate ?? 0) >= 85 ? "success" : "warning"}>
                      {formatRate(entry.attendanceRate)}
                    </Badge>
                  ) : (
                    <Badge tone="danger">Missing</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
