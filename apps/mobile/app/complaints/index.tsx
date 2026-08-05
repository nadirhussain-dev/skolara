import { useCreateComplaint, useMyComplaints } from "@skolara/api-client";
import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const STATUS_COLOR: Record<string, string> = {
  OPEN: "#F59E0B",
  IN_PROGRESS: "#3730A3",
  RESOLVED: "#059669",
};

export default function ComplaintsScreen() {
  const { data: complaints, isLoading } = useMyComplaints();
  const createComplaint = useCreateComplaint();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  async function submit() {
    if (!subject || !body) return;
    await createComplaint.mutateAsync({ subject, body });
    setSubject("");
    setBody("");
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
          style={styles.input}
        />
        <TextInput
          placeholder="Describe the issue"
          value={body}
          onChangeText={setBody}
          multiline
          style={[styles.input, styles.textarea]}
        />
        <Pressable style={styles.button} onPress={submit} disabled={createComplaint.isPending}>
          <Text style={styles.buttonText}>
            {createComplaint.isPending ? "Submitting..." : "Submit complaint"}
          </Text>
        </Pressable>
      </View>

      {isLoading && <Text>Loading...</Text>}
      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/complaints/${item.id}`} style={styles.row}>
            <Text style={styles.subject}>{item.subject}</Text>
            <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
              {item.status}
            </Text>
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <Text>No complaints yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  form: { gap: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  button: {
    backgroundColor: "#3730A3",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  subject: { fontSize: 16, fontWeight: "600" },
  status: { fontSize: 13, fontWeight: "600", marginTop: 2 },
});
