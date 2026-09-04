import {
  useMyChildren,
  useMyTimetable,
  usePeriods,
  useStudentTimetable,
  type TimetableEntryDetail,
} from "@skolara/api-client";
import { TEACHING_DAYS, type DayOfWeek } from "@skolara/types";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { useSession } from "@/lib/session";
import { colors, spacing, typography } from "@/lib/theme";
import { Card, Chip, EmptyState, LoadingLine, Screen, SectionLabel } from "@/lib/ui";

/**
 * One screen for both audiences. A teacher sees the lessons they teach; a
 * parent or student sees the lessons their class receives. The layout is a
 * day-by-day list rather than the web's week grid — a seven-column table is
 * unreadable on a phone.
 */
export default function TimetableScreen() {
  const { role } = useSession();
  const { t } = useTranslation();
  const isTeacher = role === "TEACHER";

  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const activeStudentId = studentId ?? children?.[0]?.id;

  const teacherTimetable = useMyTimetable();
  const studentTimetable = useStudentTimetable(isTeacher ? undefined : activeStudentId);
  const { data: periods } = usePeriods();

  const query = isTeacher ? teacherTimetable : studentTimetable;
  const entries = query.data;

  const byDay = useMemo(() => {
    const order = new Map(periods?.map((p, i) => [p.id, i]) ?? []);
    const grouped = new Map<DayOfWeek, TimetableEntryDetail[]>();
    for (const day of TEACHING_DAYS) {
      const lessons = (entries ?? [])
        .filter((entry) => entry.dayOfWeek === day)
        .sort((a, b) => (order.get(a.periodId) ?? 0) - (order.get(b.periodId) ?? 0));
      if (lessons.length > 0) grouped.set(day, lessons);
    }
    return grouped;
  }, [entries, periods]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {!isTeacher && (children?.length ?? 0) > 1 && (
          <View style={styles.chipRow}>
            {children?.map((child) => (
              <Chip
                key={child.id}
                label={child.user.firstName}
                active={activeStudentId === child.id}
                onPress={() => setStudentId(child.id)}
              />
            ))}
          </View>
        )}

        {query.isLoading && <LoadingLine label={t("common.loading")} />}

        {!query.isLoading && byDay.size === 0 && (
          <EmptyState
            title={
              isTeacher
                ? t("timetable.noLessonsScheduled")
                : t("mobileFamilyWork.noTimetableForClass")
            }
          />
        )}

        {TEACHING_DAYS.filter((day) => byDay.has(day)).map((day) => (
          <View key={day} style={styles.daySection}>
            <SectionLabel>{t(`days.long.${day}`)}</SectionLabel>
            {byDay.get(day)?.map((entry) => {
              const period = periods?.find((p) => p.id === entry.periodId);
              return (
                <Card key={entry.id} style={styles.lesson}>
                  <View style={styles.time}>
                    <Text style={styles.timeText}>{period?.startTime ?? "--:--"}</Text>
                    <Text style={styles.timeSub}>{period?.endTime ?? ""}</Text>
                  </View>
                  <View style={styles.detail}>
                    <Text style={styles.subject}>{entry.subject}</Text>
                    <Text style={styles.meta}>
                      {isTeacher
                        ? `${entry.class.name} ${entry.class.section}`
                        : `${entry.teacherUser.firstName} ${entry.teacherUser.lastName}`}
                      {entry.room ? ` · ${entry.room}` : ""}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingBottom: spacing.xl },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  daySection: { gap: spacing.sm },
  lesson: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  time: {
    minWidth: 56,
    borderRightWidth: 1,
    borderRightColor: colors.slate[100],
    paddingRight: spacing.md,
  },
  timeText: { ...typography.subheading, fontVariant: ["tabular-nums"] },
  timeSub: { fontSize: 12, color: colors.slate[400], fontVariant: ["tabular-nums"] },
  detail: { flex: 1, gap: 2 },
  subject: { ...typography.subheading },
  meta: { fontSize: 13, color: colors.slate[500] },
});
