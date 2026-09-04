import { useMyChildren, useStudentGrades } from "@skolara/api-client";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { colors, spacing, typography } from "@/lib/theme";
import { Card, Chip, EmptyState, LoadingLine, Screen } from "@/lib/ui";

export default function ResultsScreen() {
  const { t } = useTranslation();
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const { data: grades, isLoading } = useStudentGrades(studentId);

  return (
    <Screen>
      <View style={styles.chipRow}>
        {children?.map((child) => (
          <Chip
            key={child.id}
            label={child.user.firstName}
            active={studentId === child.id}
            onPress={() => setStudentId(child.id)}
          />
        ))}
      </View>

      {isLoading && <LoadingLine label={t("common.loading")} />}
      <FlatList
        data={grades}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.subject}>
              {t("results.subjectLine", { subject: item.subject, examType: item.examType })}
            </Text>
            <Text style={styles.term}>{item.term}</Text>
            <Text style={styles.score}>
              {t("results.score", {
                obtained: Number(item.marksObtained),
                max: Number(item.maxMarks),
              })}
            </Text>
            {item.comments && <Text style={styles.comments}>{item.comments}</Text>}
          </Card>
        )}
        ListEmptyComponent={studentId && !isLoading ? <EmptyState title={t("results.noResults")} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  subject: { ...typography.subheading },
  term: { ...typography.muted, color: colors.slate[500] },
  score: { fontSize: 20, color: colors.brand[700], fontWeight: "800" },
  comments: { fontStyle: "italic", color: colors.slate[500] },
});
