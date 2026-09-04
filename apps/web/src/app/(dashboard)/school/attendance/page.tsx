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
import { useTranslation } from "@skolara/i18n";
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
  const { t } = useTranslation();
  const { data, isLoading } = useSchoolDayAttendance(date);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("attendance.title")}
        description={t("schoolAttendance.description")}
      />

      <Card>
        <label className="flex max-w-[220px] flex-col gap-1 text-sm">
          {t("common.date")}
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </Card>

      {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t("attendance.attendanceRate")} value={formatRate(data.attendanceRate)} />
            <StatCard
              label={t("attendance.present")}
              value={`${data.presentCount} / ${data.totalCount}`}
            />
            <StatCard
              label={t("attendance.registersNotTaken")}
              value={String(data.unmarkedClassCount)}
              hint={
                data.unmarkedClassCount > 0
                  ? t("schoolAttendance.chaseTeachers")
                  : t("schoolAttendance.everyClassMarked")
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("schoolAttendance.byClass")}</CardTitle>
            </CardHeader>

            {data.classes.length === 0 && <EmptyState title={t("schoolAttendance.noClassesSetUp")} />}

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
                        ? t("attendance.presentOfTotal", {
                            present: entry.presentCount,
                            total: entry.totalCount,
                          })
                        : t("attendance.registerNotTaken")}
                    </p>
                  </div>
                  {entry.marked ? (
                    <Badge tone={(entry.attendanceRate ?? 0) >= 85 ? "success" : "warning"}>
                      {formatRate(entry.attendanceRate)}
                    </Badge>
                  ) : (
                    <Badge tone="danger">{t("schoolAttendance.missing")}</Badge>
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
