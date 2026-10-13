import { useClassAssignments, useStudentAssignments, useSubmitAssignment, useUploadFile, type AssignmentWithProgress } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChildSwitcher } from "@/components/child-switcher";
import { ChildProvider, useChild } from "@/lib/child-context";
import { formatDay, todayKey } from "@/lib/dates";
import { palette } from "@/lib/school-theme";
import { subjectColour } from "@/lib/subject-colour";
import { spacing } from "@/lib/theme";
import { assetToUploadable } from "@/lib/upload";
import { Button, Card, EmptyState, ErrorState, Muted, Pill, SectionLabel, Skeleton, Txt } from "@/lib/ui";

/** Homework for the selected child: what is due, what is in, and the teacher's mark. */
export default function HomeworkScreen() {
  return (
    <ChildProvider>
      <Homework />
    </ChildProvider>
  );
}

function localDay(value: Date | string): string {
  return todayKey(new Date(value));
}

function Homework() {
  const { t } = useTranslation();
  const { child } = useChild();
  const homework = useClassAssignments(child?.classId ?? "");
  const handedIn = useStudentAssignments(child?.id);
  const byAssignment = new Map((handedIn.data ?? []).map((s) => [s.assignmentId, s]));
  const today = todayKey();
  const all = homework.data ?? [];
  const todo = all.filter((a) => !byAssignment.has(a.id) && localDay(a.dueDate) >= today).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  const done = all.filter((a) => byAssignment.has(a.id));
  const missed = all.filter((a) => !byAssignment.has(a.id) && localDay(a.dueDate) < today);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={homework.isRefetching} onRefresh={() => { void homework.refetch(); void handedIn.refetch(); }} />}
    >
      <ChildSwitcher />
      {!child ? (
        <Card><EmptyState title={t("app.noChildren")} description={t("app.noChildrenBody")} /></Card>
      ) : homework.isError ? (
        <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void homework.refetch()} />
      ) : !homework.data ? (
        <><Skeleton height={120} /><Skeleton height={120} /></>
      ) : all.length === 0 ? (
        <Card><EmptyState title={t("mobileFamilyWork.noAssignmentsForClass")} description={t("everyday.homeworkEmptyBody")} /></Card>
      ) : (
        <>
          <SectionLabel>{t("everyday.toDo", { count: todo.length })}</SectionLabel>
          {todo.length === 0 ? <Card><Muted>{t("everyday.allDone")}</Muted></Card> : todo.map((a) => <HomeworkCard key={a.id} homework={a} studentId={child.id} />)}
          {done.length > 0 && <SectionLabel>{t("everyday.handedInSection")}</SectionLabel>}
          {done.map((a) => <HomeworkCard key={a.id} homework={a} studentId={child.id} submission={byAssignment.get(a.id)} />)}
          {missed.length > 0 && <SectionLabel>{t("everyday.missed")}</SectionLabel>}
          {missed.map((a) => <HomeworkCard key={a.id} homework={a} studentId={child.id} missed />)}
        </>
      )}
    </ScrollView>
  );
}

function HomeworkCard({
  homework,
  studentId,
  submission,
  missed,
}: {
  homework: AssignmentWithProgress;
  studentId: string;
  submission?: { grade: string | null; feedback: string | null; submittedAt: Date | string };
  missed?: boolean;
}) {
  const { t, locale } = useTranslation();
  const upload = useUploadFile();
  const submit = useSubmitAssignment();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const colour = subjectColour(homework.subject);
  const today = todayKey();
  const dueKey = localDay(homework.dueDate);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = dueKey === today ? t("homework.dueToday") : dueKey === todayKey(tomorrow) ? t("homework.dueTomorrow") : t("homework.dueOn", { date: formatDay(homework.dueDate, locale) });

  async function handIn(fromCamera: boolean) {
    setStatus(null);
    const permission = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus({ ok: false, text: t("everyday.needPermission") });
      return;
    }
    const picked = fromCamera ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (picked.canceled || !picked.assets[0]) return;
    try {
      // The teacher opens it from their own browser, so it goes to storage first.
      const file = await upload.mutateAsync({ file: assetToUploadable(picked.assets[0]), purpose: "ASSIGNMENT_SUBMISSION" });
      await submit.mutateAsync({ assignmentId: homework.id, studentId, input: { fileUrl: file.url } });
      setStatus({ ok: true, text: t("mobileFamilyWork.submittedBody") });
    } catch (error) {
      setStatus({ ok: false, text: error instanceof Error ? error.message : t("mobileFamilyWork.tryAgain") });
    }
  }

  const busy = upload.isPending || submit.isPending;
  return (
    <Card>
      <View style={styles.top}>
        <View style={[styles.subject, { backgroundColor: colour.bg }]}><Text style={{ color: colour.fg, fontWeight: "800", fontSize: 12 }}>{homework.subject}</Text></View>
        {submission ? (
          <Pill label={submission.grade ? t("mobileFamilyWork.submittedWithGrade", { grade: submission.grade }) : t("mobileFamilyWork.submitted")} tone="success" />
        ) : (
          <Pill label={missed ? t("homework.closedOn", { date: formatDay(homework.dueDate, locale) }) : due} tone={missed ? "danger" : dueKey === today ? "warning" : "brand"} />
        )}
      </View>
      <Txt style={styles.title}>{homework.title}</Txt>
      {homework.description ? <Muted>{homework.description}</Muted> : null}
      {submission?.feedback ? <Txt style={{ color: palette.ink }}>“{submission.feedback}”</Txt> : null}
      {status && <Txt accessibilityLiveRegion="polite" style={{ color: status.ok ? palette.success : palette.danger, fontWeight: "700" }}>{status.text}</Txt>}
      {!submission && !missed && (
        <View style={styles.actions}>
          <Button title={t("everyday.takePhoto")} icon="camera-outline" onPress={() => void handIn(true)} loading={busy} style={{ flex: 1 }} />
          <Button title={t("everyday.choosePhoto")} icon="images-outline" variant="secondary" onPress={() => void handIn(false)} disabled={busy} style={{ flex: 1 }} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, flexWrap: "wrap" },
  subject: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  title: { color: palette.ink, fontWeight: "800", fontSize: 17 },
  actions: { flexDirection: "row", gap: spacing.sm },
});
