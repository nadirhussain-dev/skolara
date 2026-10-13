import { useClassAssignments, useClasses, useCreateAssignment } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { DayRangePicker, dayFromToday, type DayRange } from "@/components/day-picker";
import { formatDay, todayKey } from "@/lib/dates";
import { palette } from "@/lib/school-theme";
import { subjectColour } from "@/lib/subject-colour";
import { spacing } from "@/lib/theme";
import { Button, Card, Chip, EmptyState, ErrorState, Field, Meter, Muted, SectionLabel, Skeleton, Txt } from "@/lib/ui";

/** A teacher's homework for one class: set it from the phone and see who has handed it in. */
export default function TeacherHomeworkScreen() {
  const { t, locale } = useTranslation();
  const classes = useClasses();
  const [picked, setPicked] = useState<string | null>(null);
  const classId = picked ?? classes.data?.[0]?.id ?? "";
  const homework = useClassAssignments(classId);
  const [writing, setWriting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const today = todayKey();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={homework.isRefetching} onRefresh={() => void homework.refetch()} />}
    >
      {classes.data && classes.data.length === 0 ? (
        <Card><EmptyState title={t("homework.noClasses")} description={t("homework.noClassesBody")} /></Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {(classes.data ?? []).map((c) => (
            <Chip key={c.id} label={`${c.name}-${c.section}`} active={c.id === classId} onPress={() => { setPicked(c.id); setWriting(false); }} />
          ))}
        </ScrollView>
      )}

      {classId ? (
        writing ? (
          <NewHomework classId={classId} onDone={(title) => { setWriting(false); setNotice(title ? t("homework.sent", { title }) : null); }} />
        ) : (
          <>
            {notice && <Txt accessibilityLiveRegion="polite" style={{ color: palette.success, fontWeight: "700" }}>{notice}</Txt>}
            <Button title={t("homework.set")} icon="add" onPress={() => { setWriting(true); setNotice(null); }} />
          </>
        )
      ) : null}

      {classId && <SectionLabel>{t("homework.title")}</SectionLabel>}
      {homework.isError ? (
        <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void homework.refetch()} />
      ) : classId && !homework.data ? (
        <Skeleton />
      ) : (homework.data ?? []).length === 0 && classId ? (
        <Card><EmptyState title={t("homework.noneYet")} description={t("homework.noneYetBody")} /></Card>
      ) : (
        (homework.data ?? []).map((a) => {
          const colour = subjectColour(a.subject);
          const share = a.classSize > 0 ? (a.submittedCount / a.classSize) * 100 : 0;
          const past = todayKey(new Date(a.dueDate)) < today;
          return (
            <Pressable key={a.id} onPress={() => router.push(`/assignments/submissions/${a.id}`)} accessibilityRole="button">
              <Card>
                <View style={styles.top}>
                  <View style={[styles.subject, { backgroundColor: colour.bg }]}><Text style={{ color: colour.fg, fontWeight: "800", fontSize: 12 }}>{a.subject}</Text></View>
                  <Muted style={{ fontSize: 13 }}>{past ? t("homework.closedOn", { date: formatDay(a.dueDate, locale) }) : t("homework.dueOn", { date: formatDay(a.dueDate, locale) })}</Muted>
                </View>
                <Txt style={styles.title}>{a.title}</Txt>
                <Meter value={share} label={t("homework.handedIn", { count: a.submittedCount, total: a.classSize })} />
                <Muted style={{ fontSize: 13 }}>{t("homework.handedIn", { count: a.submittedCount, total: a.classSize })}</Muted>
              </Card>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function NewHomework({ classId, onDone }: { classId: string; onDone: (title: string | null) => void }) {
  const { t } = useTranslation();
  const create = useCreateAssignment();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState<DayRange>({ start: dayFromToday(2), end: null });
  const [errors, setErrors] = useState<{ subject?: string; title?: string; form?: string }>({});

  function submit() {
    const found = { subject: subject.trim() ? undefined : t("homework.subjectRequired"), title: title.trim() ? undefined : t("homework.titleRequired") };
    setErrors(found);
    if (found.subject || found.title || !due.start) return;
    create.mutate(
      // End of the chosen day, so "due Thursday" still counts on Thursday evening.
      { classId, subject: subject.trim(), title: title.trim(), description: description.trim() || undefined, dueDate: new Date(`${due.start}T23:59:00`) },
      { onSuccess: () => onDone(title.trim()), onError: (e) => setErrors({ form: e instanceof Error ? e.message : t("common.somethingWentWrong") }) },
    );
  }

  return (
    <Card>
      <Txt style={styles.title}>{t("homework.set")}</Txt>
      <Field label={t("fields.subject")} value={subject} onChangeText={setSubject} placeholder={t("homework.subjectPlaceholder")} maxLength={60} error={errors.subject} />
      <Field label={t("homework.what")} value={title} onChangeText={setTitle} placeholder={t("homework.whatPlaceholder")} maxLength={140} error={errors.title} />
      <Field label={t("homework.instructions")} value={description} onChangeText={setDescription} multiline maxLength={2000} />
      <Txt style={{ color: palette.ink, fontWeight: "700", fontSize: 14 }}>{t("homework.due")}</Txt>
      <DayRangePicker value={due} onChange={(next) => setDue({ start: next.end ?? next.start, end: null })} from={0} to={30} />
      <Muted style={{ fontSize: 13 }}>{t("homework.deliveryNote")}</Muted>
      {errors.form && <Txt style={{ color: palette.danger, fontWeight: "700" }}>{errors.form}</Txt>}
      <Button title={t("homework.send")} onPress={submit} loading={create.isPending} />
      <Button title={t("common.cancel")} variant="ghost" onPress={() => onDone(null)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  subject: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  title: { color: palette.ink, fontWeight: "800", fontSize: 17 },
});
