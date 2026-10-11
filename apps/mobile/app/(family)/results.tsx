import { useStudentGrades } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChildSwitcher } from "@/components/child-switcher";
import { useChild } from "@/lib/child-context";
import { palette } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { BrandHeader, Card, EmptyState, ErrorState, Heading, Meter, Muted, Skeleton, Txt } from "@/lib/ui";

interface Group {
  key: string;
  term: string;
  examType: string;
  rows: { id: string; subject: string; obtained: number; max: number; percent: number; comments: string | null }[];
  average: number;
}

/** Results for the selected child, one card per exam, newest first. */
export default function FamilyResults() {
  const { t } = useTranslation();
  const { child } = useChild();
  const grades = useStudentGrades(child?.id);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group & { latest: number }>();
    for (const g of grades.data ?? []) {
      const key = `${g.term}\u0000${g.examType}`;
      const max = Number(g.maxMarks);
      const obtained = Number(g.marksObtained);
      const group = map.get(key) ?? { key, term: g.term, examType: g.examType, rows: [], average: 0, latest: 0 };
      group.rows.push({ id: g.id, subject: g.subject, obtained, max, percent: max > 0 ? (obtained / max) * 100 : 0, comments: g.comments });
      group.latest = Math.max(group.latest, new Date(g.updatedAt).getTime());
      map.set(key, group);
    }
    return [...map.values()]
      .sort((a, b) => b.latest - a.latest)
      .map((group) => ({
        ...group,
        rows: group.rows.sort((a, b) => a.subject.localeCompare(b.subject)),
        average: group.rows.reduce((sum, row) => sum + row.percent, 0) / group.rows.length,
      }));
  }, [grades.data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.page }} edges={["left", "right"]}>
      <BrandHeader title={t("app.tabResults")} subtitle={child ? `${child.user.firstName} ${child.user.lastName}` : undefined}>
        <ChildSwitcher />
      </BrandHeader>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={grades.isRefetching} onRefresh={() => void grades.refetch()} />}
      >
        {!child ? (
          <Card><EmptyState title={t("app.noChildren")} description={t("app.noChildrenBody")} /></Card>
        ) : grades.isError ? (
          <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void grades.refetch()} />
        ) : !grades.data ? (
          <><Skeleton height={160} /><Skeleton height={160} /></>
        ) : groups.length === 0 ? (
          <Card><EmptyState title={t("app.resultsEmpty")} description={t("app.resultsEmptyBody")} /></Card>
        ) : (
          groups.map((group) => (
            <Card key={group.key}>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Heading>{group.examType}</Heading>
                  <Muted>{group.term}</Muted>
                </View>
                <Txt style={styles.average}>{t("app.average", { percent: Math.round(group.average) })}</Txt>
              </View>
              {group.rows.map((row) => (
                <View key={row.id} style={styles.subject}>
                  <View style={styles.subjectTop}>
                    <Txt style={{ flex: 1, color: palette.ink, fontWeight: "700" }}>{row.subject}</Txt>
                    <Txt style={{ color: palette.ink, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{t("app.outOf", { obtained: row.obtained, max: row.max })}</Txt>
                  </View>
                  <Meter value={row.percent} tone={row.percent >= 40 ? "brand" : "danger"} label={`${row.subject}: ${Math.round(row.percent)}%`} />
                  {row.comments ? <Muted style={{ fontStyle: "italic" }}>{row.comments}</Muted> : null}
                </View>
              ))}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  average: { color: palette.ink, fontWeight: "800", fontSize: 16 },
  subject: { gap: 6, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.line },
  subjectTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
