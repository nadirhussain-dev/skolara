import { useMyTimetable, useStudentTimetable, type TimetableEntryDetail } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { TEACHING_DAYS, type DayOfWeek } from "@skolara/types";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChildSwitcher } from "@/components/child-switcher";
import { ChildProvider, useChild } from "@/lib/child-context";
import { palette, useTheme } from "@/lib/school-theme";
import { useSession } from "@/lib/session";
import { subjectColour } from "@/lib/subject-colour";
import { radius, spacing } from "@/lib/theme";
import { Card, Chip, EmptyState, ErrorState, Muted, Skeleton, Txt } from "@/lib/ui";

/**
 * One day at a time, today first. A teacher sees what they teach; a family
 * sees what the child's class has. A seven-column grid is unreadable on a
 * phone, so the week is a row of day chips instead.
 */
export default function TimetableScreen() {
  return (
    <ChildProvider>
      <Timetable />
    </ChildProvider>
  );
}

function todaysDay(): DayOfWeek {
  return TEACHING_DAYS[(new Date().getDay() + 6) % 7] ?? "MONDAY";
}

function Timetable() {
  const { t } = useTranslation();
  const { brand } = useTheme();
  const session = useSession();
  const isTeacher = session.role === "TEACHER";
  const { child } = useChild();
  const mine = useMyTimetable({ enabled: isTeacher });
  const family = useStudentTimetable(session.isLoaded && !isTeacher ? child?.id : undefined);
  const query = isTeacher ? mine : family;
  const [day, setDay] = useState<DayOfWeek>(todaysDay);
  const today = todaysDay();
  const lessons = (query.data ?? [])
    .filter((entry: TimetableEntryDetail) => entry.dayOfWeek === day)
    .sort((a, b) => a.period.sortOrder - b.period.sortOrder);
  const now = new Date();
  const nowHm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
    >
      {!isTeacher && <ChildSwitcher />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {TEACHING_DAYS.map((d) => (
          <Chip key={d} label={d === today ? `${t(`days.short.${d}`)} •` : t(`days.short.${d}`)} active={d === day} onPress={() => setDay(d)} />
        ))}
      </ScrollView>
      <Txt accessibilityRole="header" style={styles.heading}>{day === today ? t("timetable.today") : t(`days.long.${day}`)}</Txt>

      {query.isError ? (
        <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <><Skeleton height={64} /><Skeleton height={64} /><Skeleton height={64} /></>
      ) : query.data.length === 0 ? (
        <Card><EmptyState title={isTeacher ? t("timetable.noLessonsScheduled") : t("mobileFamilyWork.noTimetableForClass")} /></Card>
      ) : lessons.length === 0 ? (
        <Card><EmptyState title={t("everyday.noLessonsThatDay")} /></Card>
      ) : (
        lessons.map((lesson) => {
          const colour = subjectColour(lesson.subject);
          const isNow = day === today && lesson.period.startTime <= nowHm && nowHm < lesson.period.endTime;
          return (
            <View key={lesson.id} style={[styles.lesson, isNow && { borderColor: brand[700], borderWidth: 2 }]}>
              <View style={styles.time}>
                <Text style={styles.start}>{lesson.period.startTime}</Text>
                <Text style={styles.end}>{lesson.period.endTime}</Text>
              </View>
              <View style={[styles.bar, { backgroundColor: colour.fg }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.subject, { color: colour.fg }]}>{lesson.subject}</Text>
                <Muted style={{ fontSize: 13 }}>
                  {isTeacher ? `${lesson.class.name}-${lesson.class.section}` : `${lesson.teacherUser.firstName} ${lesson.teacherUser.lastName}`}
                  {lesson.room ? ` · ${t("timetable.roomShort", { room: lesson.room })}` : ""}
                </Muted>
              </View>
              {isNow && <View style={[styles.now, { backgroundColor: brand[700] }]}><Text style={styles.nowText}>{t("everyday.now")}</Text></View>}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  days: { gap: spacing.sm },
  heading: { color: palette.ink, fontWeight: "800", fontSize: 18 },
  lesson: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: palette.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: palette.line, minHeight: 64 },
  time: { width: 50 },
  start: { color: palette.ink, fontWeight: "800", fontSize: 15, fontVariant: ["tabular-nums"] },
  end: { color: palette.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
  bar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  subject: { fontWeight: "800", fontSize: 16 },
  now: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  nowText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
});
