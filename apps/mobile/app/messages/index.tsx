import { useApiClient, useMyChildren, useStartThread, useThreads } from "@skolara/api-client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

interface TeacherOption {
  id: string;
  userId: string;
  user: { firstName: string; lastName: string };
}

export default function ThreadsScreen() {
  const { data: threads, isLoading } = useThreads();
  const { data: children } = useMyChildren();
  const api = useApiClient();
  const { data: teachers } = useQuery<TeacherOption[]>({
    queryKey: ["teachers"],
    queryFn: () => api.request("/teachers"),
    enabled: Boolean(children?.length),
  });
  const startThread = useStartThread();
  const [studentId, setStudentId] = useState<string>();

  async function startWith(teacherUserId: string) {
    if (!studentId) return;
    await startThread.mutateAsync({ studentId, teacherUserId });
  }

  return (
    <View style={styles.container}>
      {children && children.length > 0 && (
        <View style={styles.newSection}>
          <Text style={styles.sectionTitle}>Start a new conversation</Text>
          <View style={styles.chipRow}>
            {children.map((c) => (
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
          {studentId && (
            <View style={styles.chipRow}>
              {teachers?.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => startWith(t.userId)}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>
                    {t.user.firstName} {t.user.lastName}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {isLoading && <Text>Loading conversations...</Text>}
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/messages/${item.id}`} style={styles.row}>
            {item.student.user.firstName} {item.student.user.lastName}
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <Text>No conversations yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  newSection: { gap: 8, marginBottom: 8 },
  sectionTitle: { fontWeight: "600", color: "#334155" },
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    fontSize: 16,
  },
});
