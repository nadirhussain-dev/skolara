import { useApiClient, useMyChildren, useStartThread, useThreads } from "@skolara/api-client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "@/lib/theme";
import { Card, Chip, EmptyState, LoadingLine, Screen, SectionLabel } from "@/lib/ui";

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
    <Screen>
      {children && children.length > 0 && (
        <Card>
          <SectionLabel>Start a new conversation</SectionLabel>
          <View style={styles.chipRow}>
            {children.map((c) => (
              <Chip
                key={c.id}
                label={c.user.firstName}
                active={studentId === c.id}
                onPress={() => setStudentId(c.id)}
              />
            ))}
          </View>
          {studentId && (
            <View style={styles.chipRow}>
              {teachers?.map((t) => (
                <Chip
                  key={t.id}
                  label={`${t.user.firstName} ${t.user.lastName}`}
                  onPress={() => startWith(t.userId)}
                />
              ))}
            </View>
          )}
        </Card>
      )}

      {isLoading && <LoadingLine label="Loading conversations..." />}
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Link href={`/messages/${item.id}`} asChild>
            <Pressable>
              <Card>
                <Text style={styles.row}>
                  {item.student.user.firstName} {item.student.user.lastName}
                </Text>
              </Card>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title="No conversations yet" /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { ...typography.subheading },
});
