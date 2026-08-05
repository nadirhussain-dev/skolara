import { useNotices } from "@skolara/api-client";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function NoticesScreen() {
  const { data: notices, isLoading } = useNotices();

  return (
    <View style={styles.container}>
      {isLoading && <Text>Loading notices...</Text>}
      <FlatList
        data={notices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text>No notices yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: { fontSize: 16, fontWeight: "600" },
  body: { color: "#475569", marginTop: 4 },
});
