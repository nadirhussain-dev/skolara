import { useAddComplaintComment, useComplaint } from "@skolara/api-client";
import type { ComplaintStatus } from "@skolara/types";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { colors, spacing, typography, type Tone } from "@/lib/theme";
import { Button, Card, Input, LoadingLine, Pill, Screen } from "@/lib/ui";

const STATUS_TONE: Record<ComplaintStatus, Tone> = {
  OPEN: "warning",
  IN_PROGRESS: "brand",
  RESOLVED: "success",
};

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: complaint, isLoading } = useComplaint(id);
  const addComment = useAddComplaintComment();
  const [comment, setComment] = useState("");

  async function submitComment() {
    if (!comment) return;
    await addComment.mutateAsync({ id, input: { body: comment } });
    setComment("");
  }

  if (isLoading || !complaint) return <LoadingLine label={t("common.loading")} />;

  return (
    <Screen>
      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.subject}>{complaint.subject}</Text>
          <Pill
            label={t(`complaintStatus.${complaint.status}`)}
            tone={STATUS_TONE[complaint.status]}
          />
        </View>
        <Text style={styles.body}>{complaint.body}</Text>
      </Card>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.xs }}
        data={complaint.comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Text style={styles.commentBody}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.replyRow}>
        <Input
          placeholder={t("mobileComplaints.addComment")}
          value={comment}
          onChangeText={setComment}
          style={{ flex: 1 }}
        />
        <Button title={t("support.send")} onPress={submitComment} style={styles.sendButton} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subject: { ...typography.heading, flexShrink: 1 },
  body: { ...typography.body, marginTop: spacing.xs },
  commentRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  commentBody: { ...typography.body },
  replyRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  sendButton: { paddingHorizontal: spacing.lg },
});
