import { useInvoicesForStudent, useNotices, useStudentAttendance } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { AttendanceStatus } from "@skolara/types";
import { formatCurrency } from "@skolara/utils";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ChildSwitcher } from "@/components/child-switcher";
import { readProfile } from "@/lib/auth";
import { useChild } from "@/lib/child-context";
import { dayKeyOf, formatDay, monthKey, todayKey } from "@/lib/dates";
import { palette, useTheme } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { BrandHeader, Button, Card, EmptyState, ErrorState, Heading, Muted, RowLink, ScreenScroll, SectionLabel, Skeleton, Txt, type Tone } from "@/lib/ui";

const TODAY_LINE = {
  PRESENT: "app.presentToday",
  ABSENT: "app.absentToday",
  LATE: "app.lateToday",
  EXCUSED: "app.excusedToday",
} as const;
const TODAY_TONE: Record<AttendanceStatus, Tone> = { PRESENT: "success", ABSENT: "danger", LATE: "warning", EXCUSED: "neutral" };
const TONE_COLOR: Record<Tone, string> = { success: palette.success, danger: palette.danger, warning: palette.warning, neutral: palette.body, brand: palette.body };

/** A parent's (or student's) first screen: is my child in school, what do I owe, what did school say. */
export default function FamilyHome() {
  const { t, locale } = useTranslation();
  const { school } = useTheme();
  const { child, isLoading, isError, refetch } = useChild();
  const attendance = useStudentAttendance(child?.id);
  const invoices = useInvoicesForStudent(child?.id);
  const notices = useNotices();
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    let active = true;
    void readProfile().then((profile) => {
      if (active && profile) setFirstName(profile.firstName);
    });
    return () => {
      active = false;
    };
  }, []);

  const header = (
    <BrandHeader title={firstName ? t("app.hello", { name: firstName }) : t("app.tabHome")} subtitle={school?.name}>
      <ChildSwitcher />
    </BrandHeader>
  );

  if (isError) {
    return (
      <ScreenScroll header={header}>
        <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={refetch} />
      </ScreenScroll>
    );
  }
  if (isLoading) {
    return <ScreenScroll header={header}><Skeleton height={96} /><Skeleton height={140} /><Skeleton height={120} /></ScreenScroll>;
  }
  if (!child) {
    return (
      <ScreenScroll header={header}>
        <Card><EmptyState title={t("app.noChildren")} description={t("app.noChildrenBody")} /></Card>
      </ScreenScroll>
    );
  }

  const name = child.user.firstName;
  const records = attendance.data ?? [];
  const todayRecord = records.find((r) => dayKeyOf(r.date) === todayKey());
  const thisMonth = records.filter((r) => dayKeyOf(r.date).startsWith(monthKey()));
  const presentDays = thisMonth.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;

  const unpaid = (invoices.data ?? [])
    .map((i) => ({ ...i, balance: Math.max(0, Number(i.amountDue) - Number(i.amountPaid)) }))
    .filter((i) => i.balance > 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const owed = unpaid.reduce((sum, i) => sum + i.balance, 0);
  const next = unpaid[0];
  const overdue = next ? dayKeyOf(next.dueDate) < todayKey() : false;

  return (
    <ScreenScroll header={header}>
      <Card>
        <SectionLabel>{t("app.today")}</SectionLabel>
        {attendance.isError ? (
          <Muted>{t("app.loadError")}</Muted>
        ) : !attendance.data ? (
          <Skeleton height={28} />
        ) : (
          <>
            <Txt accessibilityLiveRegion="polite" style={[styles.big, { color: todayRecord ? TONE_COLOR[TODAY_TONE[todayRecord.status]] : palette.ink }]}>
              {todayRecord ? t(TODAY_LINE[todayRecord.status], { name }) : t("app.notMarkedToday")}
            </Txt>
            {thisMonth.length > 0 && <Muted>{t("app.attendanceThisMonth", { present: presentDays, total: thisMonth.length })}</Muted>}
          </>
        )}
      </Card>

      <Card style={owed > 0 ? { borderColor: overdue ? "#FECACA" : "#FDE68A", backgroundColor: overdue ? "#FEF2F2" : "#FFFBEB" } : undefined}>
        <SectionLabel>{t("app.feesDue")}</SectionLabel>
        {invoices.isError ? (
          <Muted>{t("app.loadError")}</Muted>
        ) : !invoices.data ? (
          <Skeleton height={44} />
        ) : owed > 0 && next ? (
          <>
            <Txt style={styles.amount}>{formatCurrency(owed)}</Txt>
            <Txt style={{ color: overdue ? palette.danger : palette.warning, fontWeight: "700" }}>
              {overdue
                ? t("app.feesOverdue", { date: formatDay(next.dueDate, locale) })
                : unpaid.length === 1
                  ? t("app.feesDueOne", { date: formatDay(next.dueDate, locale) })
                  : t("app.feesDueBody", { count: unpaid.length, date: formatDay(next.dueDate, locale) })}
            </Txt>
            <Button title={t("app.payNow")} variant="accent" icon="cloud-upload-outline" onPress={() => router.push("/payments/submit")} />
          </>
        ) : (
          <>
            <Txt style={[styles.big, { color: palette.success }]}>{t("app.feesClear")}</Txt>
            <Muted>{t("app.feesClearBody")}</Muted>
          </>
        )}
      </Card>

      <View style={styles.sectionHead}>
        <Heading>{t("app.latestNotices")}</Heading>
        <Button title={t("app.seeAll")} variant="ghost" onPress={() => router.push("/(family)/inbox")} style={{ minHeight: 44, paddingHorizontal: spacing.sm }} />
      </View>
      {!notices.data ? (
        notices.isError ? <Muted>{t("app.loadError")}</Muted> : <Skeleton height={84} />
      ) : notices.data.length === 0 ? (
        <Card><Muted>{t("app.noticesEmpty")}</Muted></Card>
      ) : (
        notices.data.slice(0, 2).map((notice) => (
          <Card key={notice.id}>
            <Txt style={{ color: palette.ink, fontWeight: "800", fontSize: 16 }}>{notice.title}</Txt>
            <Txt numberOfLines={3} style={{ lineHeight: 21 }}>{notice.body}</Txt>
          </Card>
        ))
      )}

      <Heading>{t("app.quickActions")}</Heading>
      <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
        <RowLink icon="medkit-outline" title={t("app.reportAbsence")} onPress={() => router.push("/absences")} />
        <View style={styles.divider}><RowLink icon="book-outline" title={t("app.homework")} onPress={() => router.push("/assignments/mine")} /></View>
        <View style={styles.divider}><RowLink icon="chatbubbles-outline" title={t("app.messageTeacher")} onPress={() => router.push("/messages")} /></View>
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 19, fontWeight: "800", lineHeight: 26 },
  amount: { fontSize: 32, fontWeight: "800", color: palette.ink, fontVariant: ["tabular-nums"] },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  divider: { borderTopWidth: 1, borderTopColor: palette.line },
});
