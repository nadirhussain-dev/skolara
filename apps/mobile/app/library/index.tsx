import { useLoansForStudent, useMyChildren } from "@skolara/api-client";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";
import { Card, Chip, EmptyState, LoadingLine, Pill, Screen } from "@/lib/ui";

export default function LibraryStatusScreen() {
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const { data: loans, isLoading } = useLoansForStudent(studentId);

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

      {!studentId && (
        <EmptyState
          title="Select a child"
          description="Pick a child above to see their borrowed books."
        />
      )}

      {studentId && isLoading && <LoadingLine label="Loading loans..." />}

      <FlatList
        data={loans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => {
          const overdue = !item.returnedAt && new Date(item.dueAt) < new Date();
          return (
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.book.title}</Text>
                <Text style={styles.meta}>{item.book.author}</Text>
                <Text style={styles.meta}>
                  Due {new Date(item.dueAt).toLocaleDateString()}
                </Text>
              </View>
              {item.returnedAt ? (
                <Pill label="Returned" tone="success" />
              ) : overdue ? (
                <Pill label="Overdue" tone="danger" />
              ) : (
                <Pill label="Borrowed" tone="brand" />
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          studentId && !isLoading ? <EmptyState title="No borrowed books" /> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { ...typography.subheading },
  meta: { ...typography.muted, color: colors.slate[500] },
});
