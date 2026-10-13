import { useSchoolDayAttendance, useSchoolToday } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { formatCurrency } from "@skolara/utils";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { readProfile } from "@/lib/auth";
import { todayKey } from "@/lib/dates";
import { palette, useTheme } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { BrandHeader, Card, ErrorState, Heading, Meter, Muted, Skeleton, Txt } from "@/lib/ui";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warning" | "success" }) {
  const color = tone === "danger" ? palette.danger : tone === "warning" ? palette.warning : tone === "success" ? palette.success : palette.ink;
  return (
    <Card style={styles.stat}>
      <Muted style={{ fontSize: 13, fontWeight: "700" }}>{label}</Muted>
      <Txt style={[styles.statValue, { color }]}>{value}</Txt>
    </Card>
  );
}

/** The owner's pocket view of the school day: attendance, collections and what is waiting. */
export default function AdminHome() {
  const { t } = useTranslation();
  const { school } = useTheme();
  const today = useSchoolToday();
  const day = useSchoolDayAttendance(todayKey());
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

  const refresh = () => {
    void today.refetch();
    void day.refetch();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.page }} edges={["left", "right"]}>
      <BrandHeader title={firstName ? t("app.hello", { name: firstName }) : t("app.tabHome")} subtitle={school?.name} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={today.isRefetching || day.isRefetching} onRefresh={refresh} />}>
        {today.isError || day.isError ? (
          <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={refresh} />
        ) : !today.data || !day.data ? (
          <><Skeleton height={96} /><Skeleton height={96} /><Skeleton height={160} /></>
        ) : (
          <>
            <View style={styles.grid}>
              <Stat label={t("app.presentRate")} value={day.data.attendanceRate === null ? "–" : `${Math.round(day.data.attendanceRate)}%`} tone={day.data.attendanceRate === null ? undefined : "success"} />
              <Stat label={t("app.classesNotMarked")} value={String(day.data.unmarkedClassCount)} tone={day.data.unmarkedClassCount > 0 ? "danger" : "success"} />
              <Stat label={t("app.toVerify")} value={String(today.data.payments.pendingCount)} tone={today.data.payments.pendingCount > 0 ? "warning" : "success"} />
              <Stat label={t("app.collected")} value={formatCurrency(today.data.feesThisMonth.collectedAmount)} />
            </View>

            {today.data.feesThisMonth.collectionRate !== null && (
              <Card>
                <View style={styles.rowBetween}>
                  <Heading>{t("home.feeCollection")}</Heading>
                  <Txt style={{ color: palette.ink, fontWeight: "800" }}>{Math.round(today.data.feesThisMonth.collectionRate)}%</Txt>
                </View>
                <Meter value={today.data.feesThisMonth.collectionRate} label={t("home.feeCollection")} />
                <Muted>
                  {t("home.feeSummary", {
                    collected: formatCurrency(today.data.feesThisMonth.collectedAmount),
                    invoiced: formatCurrency(today.data.feesThisMonth.invoicedAmount),
                  })}
                </Muted>
              </Card>
            )}

            <Card>
              <Heading>{t("home.attendanceByClass")}</Heading>
              {day.data.classes.map((entry) => (
                <View key={entry.classId} style={styles.classRow}>
                  <Txt style={{ width: 56, color: palette.ink, fontWeight: "800" }}>{`${entry.name}-${entry.section}`}</Txt>
                  <View style={{ flex: 1 }}>
                    <Meter value={entry.attendanceRate ?? 0} label={`${entry.name}-${entry.section}`} />
                  </View>
                  <Txt style={{ width: 84, textAlign: "right", fontWeight: "800", color: entry.marked ? palette.ink : palette.danger }}>
                    {entry.attendanceRate === null ? t("home.notMarked") : `${Math.round(entry.attendanceRate)}%`}
                  </Txt>
                </View>
              ))}
            </Card>
            {today.data.payments.pendingCount > 0 && <Muted>{t("app.openOnWeb")}</Muted>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stat: { flexBasis: "47%", flexGrow: 1, gap: 2 },
  statValue: { fontSize: 19, fontWeight: "800", fontVariant: ["tabular-nums"] },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  classRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 32 },
});
