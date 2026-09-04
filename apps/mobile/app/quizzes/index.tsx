import { useMyChildren, useStudentQuizAttempts, useStudentQuizzes } from "@skolara/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { colors, spacing, typography } from "@/lib/theme";
import { Button, Card, Chip, EmptyState, LoadingLine, Pill, Screen, SectionLabel } from "@/lib/ui";

function windowLabel(quiz: { opensAt: Date | null; closesAt: Date | null }): string | null {
  const closes = quiz.closesAt ? new Date(quiz.closesAt) : null;
  const opens = quiz.opensAt ? new Date(quiz.opensAt) : null;
  if (closes && closes > new Date()) {
    return `Closes ${closes.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;
  }
  if (opens && opens > new Date()) {
    return `Opens ${opens.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;
  }
  return null;
}

export default function QuizzesScreen() {
  const { role } = useSession();
  // Only a student can sit a paper. A parent sees the same list read-only —
  // the API refuses an attempt started by anyone but the student themselves.
  const canSit = role === "STUDENT";

  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const activeStudentId = studentId ?? children?.[0]?.id;

  const { data: quizzes, isLoading } = useStudentQuizzes(activeStudentId);
  const { data: attempts } = useStudentQuizAttempts(activeStudentId);

  const available = (quizzes ?? []).filter((quiz) => quiz.canAttempt);
  const rest = (quizzes ?? []).filter((quiz) => !quiz.canAttempt);

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

        {isLoading && <LoadingLine label="Loading quizzes..." />}

        {available.length > 0 && (
          <>
            <SectionLabel>To sit</SectionLabel>
            {available.map((quiz) => (
              <Card key={quiz.id}>
                <View style={styles.header}>
                  <Text style={styles.title}>{quiz.title}</Text>
                  <Pill label={quiz.subject} tone="brand" />
                </View>
                <Text style={styles.meta}>
                  {quiz._count.questions} questions · {quiz.totalMarks} marks ·{" "}
                  {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "untimed"}
                </Text>
                {quiz.instructions ? <Text style={styles.meta}>{quiz.instructions}</Text> : null}
                {windowLabel(quiz) ? <Text style={styles.meta}>{windowLabel(quiz)}</Text> : null}
                {quiz.maxAttempts > 1 && (
                  <Text style={styles.meta}>
                    Attempt {quiz.attempts.length + 1} of {quiz.maxAttempts}
                  </Text>
                )}
                {canSit ? (
                  <Button
                    title={quiz.attempts.some((a) => a.status === "IN_PROGRESS") ? "Continue" : "Start"}
                    onPress={() => router.push(`/quizzes/${quiz.id}`)}
                  />
                ) : (
                  <Text style={styles.meta}>Your child can sit this from their own login.</Text>
                )}
              </Card>
            ))}
          </>
        )}

        {rest.length > 0 && (
          <>
            <SectionLabel>Done and closed</SectionLabel>
            {rest.map((quiz) => {
              const best = quiz.attempts.reduce<number | null>(
                (top, attempt) =>
                  attempt.score === null ? top : Math.max(top ?? 0, Number(attempt.score)),
                null,
              );
              return (
                <Card key={quiz.id}>
                  <View style={styles.header}>
                    <Text style={styles.title}>{quiz.title}</Text>
                    {best === null ? (
                      <Pill label={quiz.isOpen ? "Not sat" : "Closed"} tone="neutral" />
                    ) : (
                      <Pill label={`${best} / ${quiz.totalMarks}`} tone="success" />
                    )}
                  </View>
                  <Text style={styles.meta}>{quiz.subject}</Text>
                </Card>
              );
            })}
          </>
        )}

        {!isLoading && (quizzes?.length ?? 0) === 0 && (
          <EmptyState
            title="No quizzes yet"
            description="Quizzes your teachers set will show up here."
          />
        )}

        {(attempts?.length ?? 0) > 0 && (
          <>
            <SectionLabel>Past attempts</SectionLabel>
            {attempts?.map((attempt) => (
              <Card key={attempt.id}>
                <View style={styles.header}>
                  <Text style={styles.title}>{attempt.quiz.title}</Text>
                  <Pill
                    label={
                      attempt.score === null
                        ? attempt.status
                        : `${Number(attempt.score)} / ${Number(attempt.maxScore)}`
                    }
                    tone={attempt.status === "EXPIRED" ? "danger" : "success"}
                  />
                </View>
                <Text style={styles.meta}>
                  {attempt.quiz.subject} ·{" "}
                  {new Date(attempt.startedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                  {attempt.status === "EXPIRED" ? " · ran out of time" : ""}
                </Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { ...typography.subheading, flex: 1 },
  meta: { ...typography.muted, color: colors.slate[500] },
});
