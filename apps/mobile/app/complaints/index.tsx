import { useCreateComplaint, useMyComplaints } from "@skolara/api-client";
import type { ComplaintStatus } from "@skolara/types";
import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { spacing, typography, type Tone } from "@/lib/theme";
import { Button, Card, EmptyState, Input, LoadingLine, Pill, Screen, SectionLabel } from "@/lib/ui";

const STATUS_TONE: Record<ComplaintStatus, Tone> = {
  OPEN: "warning",
  IN_PROGRESS: "brand",
  RESOLVED: "success",
};

export default function ComplaintsScreen() {
  const { t } = useTranslation();
  const { data: complaints, isLoading } = useMyComplaints();
  const createComplaint = useCreateComplaint();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  async function submit() {
    if (!subject || !body) return;
    await createComplaint.mutateAsync({ subject, body });
    setSubject("");
    setBody("");
  }

  return (
    <Screen>
      <Card>
        <SectionLabel>{t("mobileComplaints.raise")}</SectionLabel>
        <Input placeholder={t("fields.subject")} value={subject} onChangeText={setSubject} />
        <Input
          placeholder={t("mobileComplaints.describe")}
          value={body}
          onChangeText={setBody}
          multiline
        />
        <Button
          title={t("mobileComplaints.submit")}
          onPress={submit}
          loading={createComplaint.isPending}
        />
      </Card>

      {isLoading && <LoadingLine />}
      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Link href={`/complaints/${item.id}`} asChild>
            <Pressable>
              <Card style={styles.row}>
                <Text style={styles.subject}>{item.subject}</Text>
                <Pill label={t(`complaintStatus.${item.status}`)} tone={STATUS_TONE[item.status]} />
              </Card>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title={t("mobileComplaints.none")} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subject: { ...typography.subheading },
});
