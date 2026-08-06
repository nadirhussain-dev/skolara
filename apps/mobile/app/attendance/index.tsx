import { useApiClient } from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { spacing, typography } from "@/lib/theme";
import { Card, EmptyState, LoadingLine, Screen } from "@/lib/ui";

export default function SelectClassScreen() {
  const api = useApiClient();
  const { data: classes, isLoading } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  return (
    <Screen>
      {isLoading && <LoadingLine label="Loading classes..." />}
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Link href={`/attendance/${item.id}`} asChild>
            <Pressable>
              <Card>
                <Text style={styles.row}>
                  {item.name} — {item.section}
                </Text>
              </Card>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title="No classes assigned yet" /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { ...typography.subheading },
});
