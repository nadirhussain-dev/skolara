import {
  useClassAssignments,
  useMyChildren,
  useStudentAssignments,
  useSubmitAssignment,
  useUploadFile,
} from "@skolara/api-client";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { colors, spacing, typography } from "@/lib/theme";
import { intlLocale } from "@/lib/intl";
import { assetToUploadable } from "@/lib/upload";
import { Button, Card, Chip, EmptyState, Pill, Screen } from "@/lib/ui";

export default function MyAssignmentsScreen() {
  const { t, locale } = useTranslation();
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const child = children?.find((c) => c.id === studentId);

  const { data: assignments } = useClassAssignments(child?.classId ?? "");
  const { data: submissions } = useStudentAssignments(studentId);
  const submitAssignment = useSubmitAssignment();
  const uploadFile = useUploadFile();

  const submittedByAssignmentId = useMemo(() => {
    const map = new Map<string, { grade: string | null }>();
    submissions?.forEach((s) => map.set(s.assignmentId, { grade: s.grade }));
    return map;
  }, [submissions]);

  async function submit(assignmentId: string) {
    if (!studentId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (picked.canceled) return;

    try {
      // The teacher opens this from their own browser, so the file has to
      // live in storage rather than on this device.
      const uploaded = await uploadFile.mutateAsync({
        file: assetToUploadable(picked.assets[0]),
        purpose: "ASSIGNMENT_SUBMISSION",
      });
      await submitAssignment.mutateAsync({
        assignmentId,
        studentId,
        input: { fileUrl: uploaded.url },
      });
      Alert.alert(t("mobileFamilyWork.submittedTitle"), t("mobileFamilyWork.submittedBody"));
    } catch (error) {
      Alert.alert(
        t("mobileFamilyWork.couldNotSubmit"),
        error instanceof Error ? error.message : t("mobileFamilyWork.tryAgain"),
      );
    }
  }

  return (
    <Screen>
      <View style={styles.chipRow}>
        {children?.map((c) => (
          <Chip
            key={c.id}
            label={c.user.firstName}
            active={studentId === c.id}
            onPress={() => setStudentId(c.id)}
          />
        ))}
      </View>

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => {
          const submission = submittedByAssignmentId.get(item.id);
          return (
            <Card>
              <Text style={styles.title}>
                {item.title} ({item.subject})
              </Text>
              <Text style={styles.due}>
                {t("mobileFamilyWork.dueOn", {
                  date: new Date(item.dueDate).toLocaleDateString(intlLocale(locale)),
                })}
              </Text>
              {submission ? (
                <Pill
                  label={
                    submission.grade
                      ? t("mobileFamilyWork.submittedWithGrade", { grade: submission.grade })
                      : t("mobileFamilyWork.submitted")
                  }
                  tone="success"
                />
              ) : (
                <Button
                  title={t("mobileFamilyWork.submitWork")}
                  variant="secondary"
                  onPress={() => submit(item.id)}
                />
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          studentId ? <EmptyState title={t("mobileFamilyWork.noAssignmentsForClass")} /> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  title: { ...typography.subheading },
  due: { ...typography.muted, color: colors.slate[500] },
});
