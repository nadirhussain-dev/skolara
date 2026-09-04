import {
  useSaveQuizAnswer,
  useStartQuizAttempt,
  useSubmitQuizAttempt,
  type QuizAttemptPaper,
  type QuizAttemptResult,
} from "@skolara/api-client";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { Button, Card, LoadingLine, Pill, Screen, SectionLabel } from "@/lib/ui";

/** Whole seconds left, or null on an untimed paper. */
function secondsLeft(expiresAt: Date | string | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function SitQuizScreen() {
  const { t } = useTranslation();
  const { quizId } = useLocalSearchParams<{ quizId: string }>();

  const start = useStartQuizAttempt();
  const saveAnswer = useSaveQuizAnswer();
  const submit = useSubmitQuizAttempt();

  const [paper, setPaper] = useState<QuizAttemptPaper>();
  const [result, setResult] = useState<QuizAttemptResult>();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [failed, setFailed] = useState<string>();

  // Opening the paper is the mutation that creates or resumes the attempt, so
  // it runs once on mount rather than on a button press — the student already
  // pressed one to get here.
  useEffect(() => {
    if (!quizId) return;
    let active = true;
    start
      .mutateAsync(quizId)
      .then((opened) => {
        if (!active) return;
        setPaper(opened);
        setSelected(
          Object.fromEntries(opened.answers.map((a) => [a.questionId, a.selectedIndex])),
        );
        setRemaining(secondsLeft(opened.expiresAt));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setFailed(error instanceof Error ? error.message : t("mobileQuizzes.couldNotOpen"));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  // The countdown is display only. The server fixed the deadline when the
  // attempt opened and settles the attempt itself, so a paused or wrong device
  // clock can't buy extra time.
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((current) => (current === null ? null : Math.max(0, current - 1)));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const answeredCount = Object.keys(selected).length;
  const totalMarks = useMemo(
    () => (paper?.questions ?? []).reduce((sum, question) => sum + Number(question.marks), 0),
    [paper],
  );

  function choose(questionId: string, index: number) {
    setSelected((current) => ({ ...current, [questionId]: index }));
    // Saved as it's chosen, not held until submit — a dead battery halfway
    // through then costs the remaining questions, not the whole paper.
    if (paper) {
      saveAnswer
        .mutateAsync({ attemptId: paper.id, input: { questionId, selectedIndex: index } })
        .catch((error: unknown) => {
          Alert.alert(
            t("mobileQuizzes.answerDidNotSave"),
            error instanceof Error
              ? error.message
              : t("mobileQuizzes.answerDidNotSaveBody"),
          );
        });
    }
  }

  async function handleSubmit() {
    if (!paper) return;
    try {
      setResult(await submit.mutateAsync(paper.id));
    } catch (error) {
      Alert.alert(
        t("mobileQuizzes.couldNotSubmit"),
        error instanceof Error ? error.message : t("mobileQuizzes.tryAgain"),
      );
    }
  }

  if (failed) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>{t("mobileQuizPaper.cantOpen")}</Text>
          <Text style={styles.meta}>{failed}</Text>
          <Button title={t("mobileQuizPaper.back")} variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  if (result) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ gap: spacing.md }}>
          <Card>
            <View style={styles.header}>
              <Text style={styles.title}>
                {result.status === "EXPIRED"
                  ? t("mobileQuizzes.timeRanOut")
                  : t("mobileQuizzes.submitted")}
              </Text>
              <Pill
                label={t("mobileQuizzes.scoreOf", {
                  score: result.score ?? 0,
                  total: result.maxScore ?? 0,
                })}
                tone={result.status === "EXPIRED" ? "danger" : "success"}
              />
            </View>
            {result.status === "EXPIRED" && (
              <Text style={styles.meta}>{t("mobileQuizPaper.markedOnWhatArrived")}</Text>
            )}
          </Card>

          <SectionLabel>{t("mobileQuizzes.yourAnswers")}</SectionLabel>
          {result.questions.map((question, index) => (
            <Card key={question.id}>
              <Text style={styles.prompt}>
                {index + 1}. {question.prompt}
              </Text>
              {question.options.map((option, optionIndex) => {
                const isKey = optionIndex === question.correctIndex;
                const wasChosen = optionIndex === question.selectedIndex;
                return (
                  <Text
                    key={optionIndex}
                    style={[
                      styles.option,
                      isKey && styles.optionCorrect,
                      wasChosen && !isKey && styles.optionWrong,
                    ]}
                  >
                    {isKey ? "✓ " : wasChosen ? "✗ " : "· "}
                    {option}
                  </Text>
                );
              })}
              <Text style={styles.meta}>
                {question.selectedIndex === null
                  ? t("mobileQuizzes.notAnswered")
                  : t("mobileQuizPaper.marksAwarded", {
                      awarded: question.marksAwarded,
                      total: question.marks,
                    })}
              </Text>
            </Card>
          ))}

          <Button title={t("mobileQuizzes.done")} onPress={() => router.back()} />
        </ScrollView>
      </Screen>
    );
  }

  if (!paper) {
    return (
      <Screen>
        <LoadingLine label={t("mobileQuizzes.openingPaper")} />
      </Screen>
    );
  }

  const outOfTime = remaining !== null && remaining <= 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        <Card>
          <View style={styles.header}>
            <Text style={styles.title}>{paper.quiz.title}</Text>
            {remaining !== null && (
              <Pill
                label={outOfTime ? t("mobileQuizzes.timeUp") : clock(remaining)}
                tone={outOfTime ? "danger" : remaining < 60 ? "warning" : "brand"}
              />
            )}
          </View>
          <Text style={styles.meta}>
            {t("mobileQuizPaper.paperMeta", {
              subject: paper.quiz.subject,
              answered: answeredCount,
              questions: paper.questions.length,
              marks: totalMarks,
            })}
          </Text>
          {paper.quiz.instructions ? (
            <Text style={styles.meta}>{paper.quiz.instructions}</Text>
          ) : null}
        </Card>

        {paper.questions.map((question, index) => (
          <Card key={question.id}>
            <Text style={styles.prompt}>
              {index + 1}. {question.prompt}
              <Text style={styles.meta}>
                {"  "}
                {t(
                  Number(question.marks) === 1
                    ? "mobileQuizPaper.markSingular"
                    : "mobileQuizPaper.markPlural",
                  { count: Number(question.marks) },
                )}
              </Text>
            </Text>
            {question.options.map((option, optionIndex) => {
              const active = selected[question.id] === optionIndex;
              return (
                <Pressable
                  key={optionIndex}
                  disabled={outOfTime}
                  onPress={() => choose(question.id, optionIndex)}
                  style={[styles.choice, active && styles.choiceActive]}
                >
                  <Text style={active ? styles.choiceTextActive : styles.choiceText}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </Card>
        ))}

        <Button
          title={
            outOfTime ? t("mobileQuizzes.timeUpSubmit") : t("mobileQuizzes.submit")
          }
          loading={submit.isPending}
          onPress={handleSubmit}
        />
        {answeredCount < paper.questions.length && !outOfTime && (
          <Text style={styles.meta}>
            {t(
              paper.questions.length - answeredCount === 1
                ? "mobileQuizPaper.unansweredOne"
                : "mobileQuizPaper.unansweredMany",
              { count: paper.questions.length - answeredCount },
            )}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { ...typography.subheading, flex: 1 },
  prompt: { ...typography.body, fontWeight: "600" },
  meta: { ...typography.muted, color: colors.slate[500] },
  option: { ...typography.body, color: colors.slate[500], paddingLeft: spacing.sm },
  optionCorrect: { color: colors.brand[700], fontWeight: "600" },
  optionWrong: { color: colors.accent[500] },
  choice: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  choiceActive: { borderColor: colors.brand[700], backgroundColor: colors.brand[50] },
  choiceText: { ...typography.body },
  choiceTextActive: { ...typography.body, color: colors.brand[700], fontWeight: "600" },
});
