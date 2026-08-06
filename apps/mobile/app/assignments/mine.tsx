import {
  useClassAssignments,
  useMyChildren,
  useStudentAssignments,
  useSubmitAssignment,
} from "@skolara/api-client";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";
import { Button, Card, Chip, EmptyState, Pill, Screen } from "@/lib/ui";

export default function MyAssignmentsScreen() {
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const child = children?.find((c) => c.id === studentId);

  const { data: assignments } = useClassAssignments(child?.classId ?? "");
  const { data: submissions } = useStudentAssignments(studentId);
  const submitAssignment = useSubmitAssignment();

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

    await submitAssignment.mutateAsync({
      assignmentId,
      studentId,
      input: { fileUrl: picked.assets[0].uri },
    });
    Alert.alert("Submitted", "Your work has been submitted.");
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
              <Text style={styles.due}>Due {new Date(item.dueDate).toLocaleDateString()}</Text>
              {submission ? (
                <Pill
                  label={submission.grade ? `Submitted · Grade ${submission.grade}` : "Submitted"}
                  tone="success"
                />
              ) : (
                <Button title="Submit work" variant="secondary" onPress={() => submit(item.id)} />
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          studentId ? <EmptyState title="No assignments for this class yet" /> : null
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
