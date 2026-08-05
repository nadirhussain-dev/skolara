import { useAddComplaintComment, useComplaint } from "@skolara/api-client";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: complaint, isLoading } = useComplaint(id);
  const addComment = useAddComplaintComment();
  const [comment, setComment] = useState("");

  async function submitComment() {
    if (!comment) return;
    await addComment.mutateAsync({ id, input: { body: comment } });
    setComment("");
  }

  if (isLoading || !complaint) return <Text style={styles.loading}>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.subject}>{complaint.subject}</Text>
      <Text style={styles.status}>{complaint.status}</Text>
      <Text style={styles.body}>{complaint.body}</Text>

      <FlatList
        style={styles.comments}
        data={complaint.comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Text style={styles.commentBody}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.replyRow}>
        <TextInput
          placeholder="Add a comment"
          value={comment}
          onChangeText={setComment}
          style={styles.input}
        />
        <Pressable style={styles.button} onPress={submitComment}>
          <Text style={styles.buttonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loading: { padding: 16 },
  subject: { fontSize: 18, fontWeight: "700" },
  status: { color: "#3730A3", fontWeight: "600", marginTop: 4 },
  body: { color: "#334155", marginTop: 8, marginBottom: 12 },
  comments: { flex: 1 },
  commentRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  commentBody: { color: "#334155" },
  replyRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: {
    backgroundColor: "#3730A3",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
