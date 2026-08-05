import { useAssignmentSubmissions, useGradeAssignment } from "@skolara/api-client";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function AssignmentSubmissionsScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const { data: submissions, isLoading } = useAssignmentSubmissions(assignmentId);
  const gradeAssignment = useGradeAssignment();
  const [grades, setGrades] = useState<Record<string, string>>({});

  async function submitGrade(submissionId: string) {
    const grade = grades[submissionId];
    if (!grade) return;
    await gradeAssignment.mutateAsync({ submissionId, input: { grade } });
  }

  return (
    <View style={styles.container}>
      {isLoading && <Text>Loading submissions...</Text>}
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>
              {item.student.user.firstName} {item.student.user.lastName}
            </Text>
            <Text style={styles.link}>View submission: {item.fileUrl}</Text>
            {item.note && <Text style={styles.note}>{item.note}</Text>}
            <View style={styles.gradeRow}>
              <TextInput
                placeholder={item.grade ?? "Grade"}
                value={grades[item.id] ?? ""}
                onChangeText={(v) => setGrades((prev) => ({ ...prev, [item.id]: v }))}
                style={styles.gradeInput}
              />
              <Pressable style={styles.button} onPress={() => submitGrade(item.id)}>
                <Text style={styles.buttonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text>No submissions yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 4,
  },
  name: { fontSize: 16, fontWeight: "600" },
  link: { color: "#3730A3", fontSize: 13 },
  note: { color: "#64748B", fontStyle: "italic" },
  gradeRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  gradeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  button: {
    backgroundColor: "#3730A3",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
