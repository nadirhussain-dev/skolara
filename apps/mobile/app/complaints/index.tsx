import { useCreateComplaint, useMyComplaints } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ChildSwitcher } from "@/components/child-switcher";
import { ChildProvider, useChild } from "@/lib/child-context";
import { timeAgo } from "@/lib/dates";
import { palette, useTheme } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { Button, Card, EmptyState, ErrorState, Field, Muted, Pill, SectionLabel, Skeleton, Txt } from "@/lib/ui";
import { CONCERN_TONE } from "@/lib/tones";
import { Ionicons } from "@expo/vector-icons";

/** Concerns a family has raised, and a short form to raise a new one. */
export default function ConcernsScreen() {
  return (
    <ChildProvider>
      <Concerns />
    </ChildProvider>
  );
}

function Concerns() {
  const { t, locale } = useTranslation();
  const { isRTL } = useTheme();
  const mine = useMyComplaints();
  const [writing, setWriting] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={mine.isRefetching} onRefresh={() => void mine.refetch()} />}
    >
      {writing ? (
        <NewConcern onDone={(didSend) => { setWriting(false); setSent(didSend); }} />
      ) : (
        <Card>
          <Txt style={styles.title}>{t("everyday.raiseTitle")}</Txt>
          <Muted>{t("everyday.raiseBody")}</Muted>
          {sent && <Txt accessibilityLiveRegion="polite" style={{ color: palette.success, fontWeight: "700" }}>{t("everyday.raisedSent")}</Txt>}
          <Button title={t("everyday.raiseButton")} icon="create-outline" onPress={() => { setWriting(true); setSent(false); }} />
        </Card>
      )}

      <SectionLabel>{t("everyday.yourConcerns")}</SectionLabel>
      {mine.isError ? (
        <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void mine.refetch()} />
      ) : !mine.data ? (
        <Skeleton />
      ) : mine.data.length === 0 ? (
        <Card><EmptyState title={t("mobileComplaints.none")} description={t("everyday.noConcernsBody")} /></Card>
      ) : (
        <Card style={styles.list}>
          {mine.data.map((c, index) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/complaints/${c.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && { backgroundColor: "#F1F5F9" }]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Txt style={styles.subject} numberOfLines={2}>{c.subject}</Txt>
                <View style={styles.meta}>
                  <Pill label={t(`complaintStatus.${c.status}`)} tone={CONCERN_TONE[c.status]} />
                  <Muted style={{ fontSize: 13 }}>
                    {timeAgo(c.createdAt, locale)}
                    {(c._count?.comments ?? 0) > 0 ? ` · ${t("concerns.replies", { count: c._count?.comments ?? 0 })}` : ""}
                  </Muted>
                </View>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#64748B" />
            </Pressable>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function NewConcern({ onDone }: { onDone: (sent: boolean) => void }) {
  const { t } = useTranslation();
  const { child } = useChild();
  const create = useCreateComplaint();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<{ subject?: string; body?: string; form?: string }>({});

  function submit() {
    const found = {
      subject: subject.trim().length < 3 ? t("everyday.subjectNeeded") : undefined,
      body: body.trim().length < 3 ? t("everyday.detailsNeeded") : undefined,
    };
    setErrors(found);
    if (found.subject || found.body) return;
    create.mutate(
      { studentId: child?.id, subject: subject.trim(), body: body.trim() },
      { onSuccess: () => onDone(true), onError: (e) => setErrors({ form: e instanceof Error ? e.message : t("common.somethingWentWrong") }) },
    );
  }

  return (
    <Card>
      <Txt style={styles.title}>{t("everyday.raiseTitle")}</Txt>
      {child && <Muted>{t("everyday.aboutChild", { child: `${child.user.firstName} ${child.user.lastName}` })}</Muted>}
      <ChildSwitcher />
      <Field label={t("everyday.subject")} value={subject} onChangeText={setSubject} maxLength={200} error={errors.subject} placeholder={t("everyday.subjectHint")} />
      <Field label={t("everyday.details")} value={body} onChangeText={setBody} maxLength={5000} multiline error={errors.body} help={t("everyday.detailsHelp")} />
      {errors.form && <Txt style={{ color: palette.danger, fontWeight: "700" }}>{errors.form}</Txt>}
      <Button title={t("everyday.sendToSchool")} onPress={submit} loading={create.isPending} />
      <Button title={t("common.cancel")} variant="ghost" onPress={() => onDone(false)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { color: palette.ink, fontWeight: "800", fontSize: 17 },
  list: { padding: 0, gap: 0, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, minHeight: 64 },
  divider: { borderTopWidth: 1, borderTopColor: palette.line },
  subject: { color: palette.ink, fontWeight: "700", fontSize: 16 },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
});
