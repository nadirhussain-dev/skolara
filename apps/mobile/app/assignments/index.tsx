import { useApiClient } from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function SelectClassForAssignmentsScreen() {
  const api = useApiClient();
  const { data: classes, isLoading } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  return (
    <View style={styles.container}>
      {isLoading && <Text>Loading classes...</Text>}
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/assignments/${item.id}`} style={styles.row}>
            {item.name} — {item.section}
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <Text>No classes assigned yet.</Text> : null}
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
    fontSize: 16,
  },
});
