import {
  useClassAssignments,
  useMyChildren,
  useStudentAssignments,
  useSubmitAssignment,
} from "@skolara/api-client";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
    <View style={styles.container}>
      <View style={styles.chipRow}>
        {children?.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setStudentId(c.id)}
            style={[styles.chip, studentId === c.id && styles.chipActive]}
          >
            <Text style={studentId === c.id ? styles.chipTextActive : styles.chipText}>
              {c.user.firstName}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const submission = submittedByAssignmentId.get(item.id);
          return (
            <View style={styles.row}>
              <Text style={styles.title}>
                {item.title} ({item.subject})
              </Text>
              <Text style={styles.due}>
                Due {new Date(item.dueDate).toLocaleDateString()}
              </Text>
              {submission ? (
                <Text style={styles.submitted}>
                  Submitted{submission.grade ? ` · Grade: ${submission.grade}` : ""}
                </Text>
              ) : (
                <Pressable style={styles.button} onPress={() => submit(item.id)}>
                  <Text style={styles.buttonText}>Submit work</Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          studentId ? <Text>No assignments for this class yet.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#3730A3",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: "#3730A3" },
  chipText: { color: "#3730A3" },
  chipTextActive: { color: "#fff" },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 4,
  },
  title: { fontSize: 16, fontWeight: "600" },
  due: { color: "#64748B", fontSize: 13 },
  submitted: { color: "#059669", fontWeight: "600", marginTop: 4 },
  button: {
    backgroundColor: "#3730A3",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 6,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
