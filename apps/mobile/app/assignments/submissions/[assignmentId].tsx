import { useAssignmentSubmissions, useGradeAssignment } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { timeAgo } from "@/lib/dates";
import { palette } from "@/lib/school-theme";
import { radius, spacing } from "@/lib/theme";
import { Avatar, Button, Card, EmptyState, ErrorState, Field, Muted, Pill, Skeleton, Txt } from "@/lib/ui";

const isImage = (url: string) => /\.(png|jpe?g|webp|heic)(\?|$)/i.test(url);

/** Everything handed in for one piece of homework, each with a mark to give. */
export default function SubmissionsScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const { t } = useTranslation();
  const submissions = useAssignmentSubmissions(assignmentId);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={submissions.isRefetching} onRefresh={() => void submissions.refetch()} />}
    >
      {submissions.isError ? (
        <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void submissions.refetch()} />
      ) : !submissions.data ? (
        <><Skeleton height={200} /><Skeleton height={200} /></>
      ) : submissions.data.length === 0 ? (
        <Card><EmptyState title={t("assignments.noSubmissions")} /></Card>
      ) : (
        submissions.data.map((s) => <Submission key={s.id} submission={s} />)
      )}
    </ScrollView>
  );
}

function Submission({ submission: s }: { submission: NonNullable<ReturnType<typeof useAssignmentSubmissions>["data"]>[number] }) {
  const { t, locale } = useTranslation();
  const mark = useGradeAssignment();
  const [grade, setGrade] = useState(s.grade ?? "");
  const [feedback, setFeedback] = useState(s.feedback ?? "");
  const [saved, setSaved] = useState(false);
  const name = `${s.student.user.firstName} ${s.student.user.lastName}`;
  // Only ever open what the API accepted as an http(s) link.
  const url = /^https?:\/\//i.test(s.fileUrl) ? s.fileUrl : null;

  return (
    <Card>
      <View style={styles.who}>
        <Avatar name={name} />
        <View style={{ flex: 1 }}>
          <Txt style={{ color: palette.ink, fontWeight: "800" }}>{name}</Txt>
          <Muted style={{ fontSize: 13 }}>{timeAgo(s.submittedAt, locale)}</Muted>
        </View>
        {s.grade ? <Pill label={s.grade} tone="success" /> : null}
      </View>
      {url && isImage(url) ? (
        <Pressable onPress={() => void Linking.openURL(url)} accessibilityRole="imagebutton" accessibilityLabel={t("homework.openWork")}>
          <Image source={{ uri: url }} style={styles.photo} resizeMode="cover" />
        </Pressable>
      ) : url ? (
        <Button title={t("homework.openWork")} variant="secondary" icon="document-outline" onPress={() => void Linking.openURL(url)} />
      ) : null}
      {s.note ? <Txt style={{ color: palette.ink }}>“{s.note}”</Txt> : null}
      <View style={styles.markRow}>
        <View style={{ width: 96 }}><Field label={t("homework.mark")} value={grade} onChangeText={(v) => { setGrade(v); setSaved(false); }} maxLength={20} placeholder="A" /></View>
        <View style={{ flex: 1 }}><Field label={t("homework.feedback")} value={feedback} onChangeText={(v) => { setFeedback(v); setSaved(false); }} maxLength={1000} /></View>
      </View>
      {saved && <Txt accessibilityLiveRegion="polite" style={{ color: palette.success, fontWeight: "700" }}>{t("homework.markSent")}</Txt>}
      <Button
        title={s.grade ? t("homework.updateMark") : t("homework.saveMark")}
        variant="secondary"
        disabled={!grade.trim()}
        loading={mark.isPending}
        onPress={() => mark.mutate({ submissionId: s.id, input: { grade: grade.trim(), feedback: feedback.trim() || undefined } }, { onSuccess: () => setSaved(true) })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  who: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  photo: { width: "100%", aspectRatio: 4 / 5, borderRadius: radius.md, backgroundColor: palette.line },
  markRow: { flexDirection: "row", gap: spacing.sm },
});
