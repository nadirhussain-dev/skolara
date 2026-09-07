import { useMyChildren, useStudentQuizAttempts, useStudentQuizzes } from "@skolara/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation, type Locale, type Translate } from "@skolara/i18n";
import { useSession } from "@/lib/session";
import { intlLocale } from "@/lib/intl";
import { colors, spacing, typography } from "@/lib/theme";
import { Button, Card, Chip, EmptyState, LoadingLine, Pill, Screen, SectionLabel } from "@/lib/ui";

const WINDOW_FORMAT = {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
} as const;

function windowLabel(
  quiz: { opensAt: Date | null; closesAt: Date | null },
  locale: Locale,
  t: Translate,
): string | null {
  const tag = intlLocale(locale);
  const closes = quiz.closesAt ? new Date(quiz.closesAt) : null;
  const opens = quiz.opensAt ? new Date(quiz.opensAt) : null;
  if (closes && closes > new Date()) {
    return t("mobileQuizzes.closesAt", { date: closes.toLocaleString(tag, WINDOW_FORMAT) });
  }
  if (opens && opens > new Date()) {
    return t("mobileQuizzes.opensAt", { date: opens.toLocaleString(tag, WINDOW_FORMAT) });
  }
  return null;
}

export default function QuizzesScreen() {
  const { t, locale } = useTranslation();
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

        {isLoading && <LoadingLine label={t("common.loading")} />}

        {available.length > 0 && (
          <>
            <SectionLabel>{t("mobileQuizzes.toSit")}</SectionLabel>
            {available.map((quiz) => (
              <Card key={quiz.id}>
                <View style={styles.header}>
                  <Text style={styles.title}>{quiz.title}</Text>
                  <Pill label={quiz.subject} tone="brand" />
                </View>
                <Text style={styles.meta}>
                  {t("mobileQuizzes.quizMeta", {
                    questions: quiz._count.questions,
                    marks: quiz.totalMarks,
                    timing: quiz.timeLimitMinutes
                      ? t("mobileQuizzes.timedMinutes", { minutes: quiz.timeLimitMinutes })
                      : t("mobileQuizzes.untimed"),
                  })}
                </Text>
                {quiz.instructions ? <Text style={styles.meta}>{quiz.instructions}</Text> : null}
                {windowLabel(quiz, locale, t) ? (
                  <Text style={styles.meta}>{windowLabel(quiz, locale, t)}</Text>
                ) : null}
                {quiz.maxAttempts > 1 && (
                  <Text style={styles.meta}>
                    {t("mobileQuizzes.attemptOf", {
                      number: quiz.attempts.length + 1,
                      total: quiz.maxAttempts,
                    })}
                  </Text>
                )}
                {canSit ? (
                  <Button
                    title={
                      quiz.attempts.some((a) => a.status === "IN_PROGRESS")
                        ? t("mobileQuizzes.continueAttempt")
                        : t("mobileQuizzes.start")
                    }
                    onPress={() => router.push(`/quizzes/${quiz.id}`)}
                  />
                ) : (
                  <Text style={styles.meta}>{t("mobileQuizzes.parentReadOnly")}</Text>
                )}
              </Card>
            ))}
          </>
        )}

        {rest.length > 0 && (
          <>
            <SectionLabel>{t("mobileQuizzes.doneAndClosed")}</SectionLabel>
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
                      <Pill
                        label={
                          quiz.isOpen ? t("mobileQuizzes.notSat") : t("mobileQuizzes.closed")
                        }
                        tone="neutral"
                      />
                    ) : (
                      <Pill
                        label={t("mobileQuizzes.scoreOf", {
                          score: best,
                          total: quiz.totalMarks,
                        })}
                        tone="success"
                      />
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
            title={t("mobileQuizzes.none")}
            description={t("mobileQuizzes.noneBody")}
          />
        )}

        {(attempts?.length ?? 0) > 0 && (
          <>
            <SectionLabel>{t("mobileQuizzes.pastAttempts")}</SectionLabel>
            {attempts?.map((attempt) => (
              <Card key={attempt.id}>
                <View style={styles.header}>
                  <Text style={styles.title}>{attempt.quiz.title}</Text>
                  <Pill
                    label={
                      attempt.score === null
                        ? t(`quizzes.attempt${attempt.status === "IN_PROGRESS" ? "InProgress" : attempt.status === "EXPIRED" ? "Expired" : "Submitted"}`)
                        : t("mobileQuizzes.scoreOf", {
                            score: Number(attempt.score),
                            total: Number(attempt.maxScore),
                          })
                    }
                    tone={attempt.status === "EXPIRED" ? "danger" : "success"}
                  />
                </View>
                <Text style={styles.meta}>
                  {t("mobileQuizzes.attemptMeta", {
                    subject: attempt.quiz.subject,
                    date: new Date(attempt.startedAt).toLocaleDateString(intlLocale(locale), {
                      day: "numeric",
                      month: "short",
                    }),
                  })}
                  {attempt.status === "EXPIRED" ? t("mobileQuizzes.ranOutOfTime") : ""}
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
