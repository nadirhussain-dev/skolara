import { useMyChildren, useStudentPerformance } from "@skolara/api-client";
import type { SubjectPerformance } from "@skolara/types";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { Card, Chip, EmptyState, LoadingLine, Screen, SectionLabel } from "@/lib/ui";

/**
 * A bar per subject rather than the web's line charts.
 *
 * On a phone, six small line charts stacked vertically is a scroll nobody
 * finishes, and the question a parent opens this to answer is "how is she
 * doing, and is that better or worse than the class" — magnitude, not shape.
 * The trend arrow carries the direction the web's curve would have shown.
 */

/** Direction of the last assessment against the one before it. */
function trend(subject: SubjectPerformance): { label: string; tone: string } | null {
  const { points } = subject;
  if (points.length < 2) return null;
  const delta = points[points.length - 1].percentage - points[points.length - 2].percentage;
  if (Math.abs(delta) < 1) return { label: "→ steady", tone: colors.slate[500] };
  return delta > 0
    ? { label: `↑ ${Math.round(delta)} pts`, tone: colors.brand[700] }
    : { label: `↓ ${Math.round(Math.abs(delta))} pts`, tone: colors.accent[700] };
}

export default function PerformanceScreen() {
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const activeStudentId = studentId ?? children?.[0]?.id;
  const activeChild = children?.find((child) => child.id === activeStudentId);

  const { data: performance, isLoading } = useStudentPerformance(activeStudentId);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        {(children?.length ?? 0) > 1 && (
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

        {isLoading && <LoadingLine label="Loading results..." />}

        {performance && performance.overallAverage !== null && (
          <Card>
            <Text style={styles.heroLabel}>Overall average</Text>
            {/* Proportional figures, not tabular — this is a display number,
                not a column of them. */}
            <Text style={styles.hero}>{performance.overallAverage}%</Text>
            <Text style={styles.meta}>
              Across {performance.subjects.length} subject
              {performance.subjects.length === 1 ? "" : "s"} ·{" "}
              {performance.subjects.reduce((sum, subject) => sum + subject.points.length, 0)}{" "}
              assessments
            </Text>
          </Card>
        )}

        {performance && performance.subjects.length > 0 && (
          <>
            <SectionLabel>By subject</SectionLabel>
            {/* Identity never rests on colour alone — the two marks are named
                once, above the bars they explain. */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: colors.brand[700] }]} />
                <Text style={styles.meta}>{activeChild?.user.firstName ?? "Student"}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendTick, { backgroundColor: colors.slate[500] }]} />
                <Text style={styles.meta}>Class average</Text>
              </View>
            </View>

            {performance.subjects.map((subject) => {
              const direction = trend(subject);
              return (
                <Card key={subject.subject}>
                  <View style={styles.header}>
                    <Text style={styles.title}>{subject.subject}</Text>
                    <Text style={styles.score}>{subject.average}%</Text>
                  </View>

                  {/* The track is the 0–100 scale, so bars are comparable
                      between subjects without an axis to read. */}
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${subject.average}%` }]} />
                    {subject.classAverage !== null && (
                      <View style={[styles.classTick, { left: `${subject.classAverage}%` }]} />
                    )}
                  </View>

                  <View style={styles.footer}>
                    <Text style={styles.meta}>
                      {subject.classAverage === null
                        ? `${subject.points.length} assessment${subject.points.length === 1 ? "" : "s"}`
                        : `Class ${subject.classAverage}%`}
                    </Text>
                    {direction && (
                      <Text style={[styles.meta, { color: direction.tone }]}>
                        {direction.label}
                      </Text>
                    )}
                  </View>
                </Card>
              );
            })}

            <SectionLabel>Every assessment</SectionLabel>
            {/* The table twin: each plotted value readable as a number, not
                only as a bar length. */}
            {performance.subjects.map((subject) =>
              subject.points.map((point) => (
                <View
                  key={`${subject.subject}-${point.term}-${point.examType}`}
                  style={styles.row}
                >
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {subject.subject} · {point.examType}
                  </Text>
                  <Text style={styles.rowValue}>{point.percentage}%</Text>
                </View>
              )),
            )}
          </>
        )}

        {!isLoading && performance && performance.subjects.length === 0 && (
          <EmptyState
            title="No results yet"
            description="Once exams or quizzes are marked, progress shows up here."
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  heroLabel: { ...typography.muted, color: colors.slate[500] },
  hero: { fontSize: 40, fontWeight: "700", color: colors.slate[900] },
  legend: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xs },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendSwatch: { width: 16, height: 8, borderRadius: 4 },
  legendTick: { width: 2, height: 12, borderRadius: 1 },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { ...typography.subheading, flex: 1 },
  score: { ...typography.subheading, fontVariant: ["tabular-nums"] },
  track: {
    height: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.slate[100],
    overflow: "hidden",
    justifyContent: "center",
  },
  // 4px rounded data-end, square where it meets the baseline.
  fill: {
    height: 8,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: colors.brand[700],
  },
  classTick: {
    position: "absolute",
    width: 2,
    height: 8,
    backgroundColor: colors.slate[500],
  },
  footer: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  meta: { ...typography.muted, color: colors.slate[500] },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  rowLabel: { ...typography.body, flex: 1, color: colors.slate[600] },
  rowValue: { ...typography.body, fontWeight: "600", fontVariant: ["tabular-nums"] },
});
