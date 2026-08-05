import { useMyChildren, useStudentGrades } from "@skolara/api-client";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export default function ResultsScreen() {
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const { data: grades, isLoading } = useStudentGrades(studentId);

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        {children?.map((child) => (
          <Pressable
            key={child.id}
            onPress={() => setStudentId(child.id)}
            style={[styles.chip, studentId === child.id && styles.chipActive]}
          >
            <Text
              style={
                studentId === child.id ? styles.chipTextActive : styles.chipText
              }
            >
              {child.user.firstName}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading && <Text>Loading results...</Text>}
      <FlatList
        data={grades}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.subject}>
              {item.subject} · {item.examType}
            </Text>
            <Text style={styles.term}>{item.term}</Text>
            <Text style={styles.score}>
              {Number(item.marksObtained)} / {Number(item.maxMarks)}
            </Text>
            {item.comments && <Text style={styles.comments}>{item.comments}</Text>}
          </View>
        )}
        ListEmptyComponent={
          studentId && !isLoading ? <Text>No results yet.</Text> : null
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
  },
  subject: { fontSize: 16, fontWeight: "600" },
  term: { color: "#64748B", fontSize: 13 },
  score: { fontSize: 18, color: "#3730A3", fontWeight: "700", marginTop: 4 },
  comments: { fontStyle: "italic", color: "#64748B", marginTop: 4 },
});
