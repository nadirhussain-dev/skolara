import { useAddComplaintComment, useComplaint } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { palette, useTheme } from "@/lib/school-theme";
import { radius, spacing } from "@/lib/theme";
import { Button, Card, ErrorState, Field, Muted, Pill, Skeleton, Txt } from "@/lib/ui";
import { CONCERN_TONE } from "@/lib/tones";

/** One concern and the school's replies, with room to add to it until it is resolved. */
export default function ConcernScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useTranslation();
  const { brand } = useTheme();
  const concern = useComplaint(id);
  const reply = useAddComplaintComment();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const time = new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  if (concern.isError) return <View style={styles.content}><ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void concern.refetch()} /></View>;
  if (!concern.data) return <View style={styles.content}><Skeleton height={120} /><Skeleton height={80} /></View>;
  const c = concern.data;

  function send() {
    if (!text.trim()) {
      setError(t("concerns.replyRequired"));
      return;
    }
    setError(null);
    reply.mutate({ id, input: { body: text.trim() } }, { onSuccess: () => setText(""), onError: (e) => setError(e instanceof Error ? e.message : t("common.somethingWentWrong")) });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Pill label={t(`complaintStatus.${c.status}`)} tone={CONCERN_TONE[c.status]} />
        <Txt accessibilityRole="header" style={styles.subject}>{c.subject}</Txt>
        {c.student && <Muted>{t("everyday.aboutChild", { child: `${c.student.user.firstName} ${c.student.user.lastName}` })}</Muted>}
        <Muted style={{ fontSize: 12 }}>{time.format(new Date(c.createdAt))}</Muted>
        <Txt style={{ color: palette.ink, lineHeight: 22 }}>{c.body}</Txt>
      </Card>

      {c.comments.map((comment) => {
        const fromSchool = comment.authorUser.role === "SCHOOL_ADMIN";
        return (
          <View key={comment.id} style={[styles.bubble, fromSchool ? { backgroundColor: brand[700], alignSelf: "flex-start" } : { backgroundColor: palette.surface, alignSelf: "flex-end" }]}>
            <Text style={{ color: fromSchool ? "rgba(255,255,255,0.85)" : palette.muted, fontSize: 12, fontWeight: "700" }}>
              {fromSchool ? t("everyday.theSchool") : t("everyday.youLabel")} · {time.format(new Date(comment.createdAt))}
            </Text>
            <Text style={{ color: fromSchool ? "#FFFFFF" : palette.ink, fontSize: 15, lineHeight: 21, marginTop: 2 }}>{comment.body}</Text>
          </View>
        );
      })}

      {c.status === "RESOLVED" ? (
        <Card><Muted>{t("everyday.resolvedNote")}</Muted></Card>
      ) : (
        <Card>
          <Field label={t("everyday.addToIt")} value={text} onChangeText={setText} multiline maxLength={5000} error={error} />
          <Button title={t("concerns.sendReply")} onPress={send} loading={reply.isPending} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  subject: { color: palette.ink, fontWeight: "800", fontSize: 20 },
  bubble: { maxWidth: "88%", borderRadius: radius.lg, padding: 12 },
});
