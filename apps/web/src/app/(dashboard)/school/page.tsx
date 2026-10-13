"use client";

import { useSchoolDayAttendance, useSchoolToday } from "@skolara/api-client";
import { useTranslation, type Translate } from "@skolara/i18n";
import { Button, Card, CardTitle, ProgressBar, Skeleton, StatCard, cn } from "@skolara/ui";
import { formatCurrency } from "@skolara/utils";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { calendarDaysBetween, classLabel, dayPart, localDateKey } from "./home-helpers";

const GREETING = {
  morning: "home.greetingMorning",
  afternoon: "home.greetingAfternoon",
  evening: "home.greetingEvening",
} as const;

function age(t: Translate, since: Date | string): string {
  const days = calendarDaysBetween(new Date(since));
  if (days === 0) return t("home.ageToday");
  if (days === 1) return t("home.ageYesterday");
  return t("home.ageDays", { days });
}

interface ActionItem {
  key: string;
  /** Amber for money and deadlines, red for something already late. */
  tone: "accent" | "danger" | "brand";
  title: string;
  detail: string;
  href: string;
  cta: string;
}

const DOT = {
  accent: "bg-accent-500",
  danger: "bg-red-700",
  brand: "bg-brand-700",
} as const;

/**
 * The school admin's home page. It opens on what needs doing today, in the
 * order it costs the school to leave it: money waiting to be confirmed,
 * registers not taken, decisions people are waiting on.
 */
export default function SchoolHomePage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const today = useSchoolToday();
  const attendance = useSchoolDayAttendance(localDateKey());

  const dateLabel = new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const header = (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
        {t(GREETING[dayPart()], { name: user?.firstName ?? "" })}
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{dateLabel}</p>
    </div>
  );

  if (today.isError || attendance.isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
            {t("home.loadError")}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              void today.refetch();
              void attendance.refetch();
            }}
          >
            {t("home.retry")}
          </Button>
        </Card>
      </div>
    );
  }

  if (!today.data || !attendance.data) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        {header}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[7.25rem] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Skeleton className="h-72 rounded-2xl lg:col-span-3" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        </div>
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  const { payments, feesThisMonth, pendingLeaveRequests, complaints } = today.data;
  const day = attendance.data;
  const unmarked = day.classes.filter((entry) => !entry.marked);
  const unmarkedNames = unmarked.map((entry) => classLabel(entry.name, entry.section)).join(", ");

  const actions: ActionItem[] = [];
  if (payments.pendingCount > 0) {
    actions.push({
      key: "payments",
      tone: "accent",
      title:
        payments.pendingCount === 1
          ? t("home.actPaymentsOne")
          : t("home.actPaymentsMany", { count: payments.pendingCount }),
      detail: t("home.actPaymentsSub", {
        amount: formatCurrency(payments.pendingAmount),
        age: payments.oldestPendingAt ? age(t, payments.oldestPendingAt) : t("home.ageToday"),
      }),
      href: "/school/payments",
      cta: t("home.verify"),
    });
  }
  if (unmarked.length > 0) {
    actions.push({
      key: "classes",
      tone: "danger",
      title:
        unmarked.length === 1
          ? t("home.actClassesOne")
          : t("home.actClassesMany", { count: unmarked.length }),
      detail: unmarkedNames,
      href: "/school/attendance",
      cta: t("home.open"),
    });
  }
  if (pendingLeaveRequests > 0) {
    actions.push({
      key: "leave",
      tone: "brand",
      title:
        pendingLeaveRequests === 1
          ? t("home.actLeaveOne")
          : t("home.actLeaveMany", { count: pendingLeaveRequests }),
      detail: t("home.actLeaveSub"),
      href: "/school/leave",
      cta: t("home.review"),
    });
  }
  if (complaints.openCount > 0) {
    actions.push({
      key: "complaints",
      tone: "brand",
      title:
        complaints.openCount === 1
          ? t("home.actComplaintsOne")
          : t("home.actComplaintsMany", { count: complaints.openCount }),
      detail: t("home.actComplaintsSub", {
        age: complaints.oldestOpenAt ? age(t, complaints.oldestOpenAt) : t("home.ageToday"),
      }),
      href: "/school/complaints",
      cta: t("home.open"),
    });
  }

  const collectedShare = feesThisMonth.collectionRate ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("home.presentToday")}
          value={day.attendanceRate === null ? "–" : `${Math.round(day.attendanceRate)}%`}
          hint={
            day.attendanceRate === null
              ? t("home.notMarkedYet")
              : t("home.presentHint", { present: day.presentCount, total: day.totalCount })
          }
          tone={day.attendanceRate === null ? "neutral" : "success"}
        />
        <StatCard
          label={t("home.collectedThisMonth")}
          value={formatCurrency(feesThisMonth.collectedAmount)}
          hint={
            feesThisMonth.collectionRate === null
              ? t("home.noInvoices")
              : t("home.collectedHint", { rate: Math.round(feesThisMonth.collectionRate) })
          }
          tone={feesThisMonth.collectionRate === null ? "neutral" : "brand"}
        />
        <StatCard
          label={t("home.toVerify")}
          value={payments.pendingCount}
          hint={
            payments.oldestPendingAt
              ? t("home.toVerifyHint", { age: age(t, payments.oldestPendingAt) })
              : t("home.nothingWaiting")
          }
          tone={payments.pendingCount > 0 ? "warning" : "success"}
        />
        <StatCard
          label={t("home.classesNotMarked")}
          value={day.unmarkedClassCount}
          hint={unmarked.length > 0 ? unmarkedNames : t("home.allMarked")}
          tone={unmarked.length > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle>{t("home.needsAction")}</CardTitle>
          {actions.length === 0 ? (
            <div className="mt-4 rounded-xl bg-emerald-50 p-5 dark:bg-emerald-950/40">
              <p className="font-extrabold text-emerald-900 dark:text-emerald-200">
                {t("home.allClearTitle")}
              </p>
              <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-200/80">
                {t("home.allClearBody")}
              </p>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {actions.map((action) => (
                <li key={action.key} className="flex flex-wrap items-center gap-3 py-3.5">
                  <span
                    aria-hidden
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[action.tone])}
                  />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-bold text-slate-900 dark:text-slate-50">{action.title}</p>
                    <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                      {action.detail}
                    </p>
                  </div>
                  <Link
                    href={action.href}
                    className="inline-flex min-h-[2.5rem] items-center rounded-lg bg-brand-50 px-4 text-sm font-extrabold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200"
                  >
                    {action.cta}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{t("home.attendanceByClass")}</CardTitle>
            <Link
              href="/school/attendance"
              className="text-sm font-bold text-brand-700 hover:underline dark:text-brand-300"
            >
              {t("home.viewAll")}
            </Link>
          </div>
          {day.classes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{t("home.noClasses")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {day.classes.map((entry) => {
                const label = classLabel(entry.name, entry.section);
                return (
                  <li key={entry.classId} className="flex items-center gap-3 text-sm">
                    <span className="w-14 shrink-0 truncate font-bold">{label}</span>
                    <ProgressBar
                      size="sm"
                      value={entry.attendanceRate ?? 0}
                      label={label}
                      className="flex-1"
                    />
                    <span
                      className={cn(
                        "w-24 shrink-0 text-end font-bold tabular-nums",
                        entry.marked
                          ? "text-slate-900 dark:text-slate-50"
                          : "text-red-700 dark:text-red-400",
                      )}
                    >
                      {entry.attendanceRate === null
                        ? t("home.notMarked")
                        : `${Math.round(entry.attendanceRate)}%`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle>{t("home.feeCollection")}</CardTitle>
          {feesThisMonth.collectionRate !== null && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("home.feeSummary", {
                collected: formatCurrency(feesThisMonth.collectedAmount),
                invoiced: formatCurrency(feesThisMonth.invoicedAmount),
              })}
              {" · "}
              <span className="font-extrabold text-slate-900 dark:text-slate-50">
                {Math.round(collectedShare)}%
              </span>
            </p>
          )}
        </div>
        {feesThisMonth.collectionRate === null ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{t("home.noInvoices")}</p>
        ) : (
          <>
            <ProgressBar
              className="mt-4"
              value={collectedShare}
              label={t("home.feeCollection")}
            />
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-brand-600" />
                {t("home.paidCount", { count: feesThisMonth.paidInvoiceCount })}
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
                {t("home.unpaidCount", { count: feesThisMonth.unpaidInvoiceCount })}
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
