import { useNotices } from "@skolara/api-client";
import { FlatList, StyleSheet, Text } from "react-native";
import { spacing, typography } from "@/lib/theme";
import { Card, EmptyState, LoadingLine, Screen } from "@/lib/ui";

export default function NoticesScreen() {
  const { data: notices, isLoading } = useNotices();

  return (
    <Screen>
      {isLoading && <LoadingLine label="Loading notices..." />}
      <FlatList
        data={notices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </Card>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title="No notices yet" /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.subheading },
  body: { ...typography.body },
});
