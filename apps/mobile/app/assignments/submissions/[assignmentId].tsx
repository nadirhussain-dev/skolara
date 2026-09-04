import { useAssignmentSubmissions, useGradeAssignment } from "@skolara/api-client";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { colors, spacing, typography } from "@/lib/theme";
import { Button, Card, EmptyState, Input, LoadingLine, Screen } from "@/lib/ui";

export default function AssignmentSubmissionsScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const { t } = useTranslation();
  const { data: submissions, isLoading } = useAssignmentSubmissions(assignmentId);
  const gradeAssignment = useGradeAssignment();
  const [grades, setGrades] = useState<Record<string, string>>({});

  async function submitGrade(submissionId: string) {
    const grade = grades[submissionId];
    if (!grade) return;
    await gradeAssignment.mutateAsync({ submissionId, input: { grade } });
  }

  return (
    <Screen>
      {isLoading && <LoadingLine label={t("common.loading")} />}
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.name}>
              {item.student.user.firstName} {item.student.user.lastName}
            </Text>
            <Text style={styles.link}>
              {t("mobileAssignments.viewSubmission", { url: item.fileUrl })}
            </Text>
            {item.note && <Text style={styles.note}>{item.note}</Text>}
            <View style={styles.gradeRow}>
              <Input
                placeholder={item.grade ?? t("assignments.grade")}
                value={grades[item.id] ?? ""}
                onChangeText={(v) => setGrades((prev) => ({ ...prev, [item.id]: v }))}
                style={{ flex: 1 }}
              />
              <Button
                title={t("common.save")}
                onPress={() => submitGrade(item.id)}
                style={styles.saveButton}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title={t("assignments.noSubmissions")} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { ...typography.subheading },
  link: { color: colors.brand[700], fontSize: 13 },
  note: { color: colors.slate[500], fontStyle: "italic" },
  gradeRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  saveButton: { paddingHorizontal: spacing.lg },
});
