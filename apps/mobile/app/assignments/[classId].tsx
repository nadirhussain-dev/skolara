import { useClassAssignments, useCreateAssignment } from "@skolara/api-client";
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function ClassAssignmentsScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { data: assignments, isLoading } = useClassAssignments(classId);
  const createAssignment = useCreateAssignment();

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function submit() {
    if (!subject || !title || !dueDate) return;
    await createAssignment.mutateAsync({
      classId,
      subject,
      title,
      dueDate: new Date(dueDate),
    });
    setSubject("");
    setTitle("");
    setDueDate("");
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
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        <TextInput
          placeholder="Due date (YYYY-MM-DD)"
          value={dueDate}
          onChangeText={setDueDate}
          style={styles.input}
        />
        <Pressable style={styles.button} onPress={submit} disabled={createAssignment.isPending}>
          <Text style={styles.buttonText}>
            {createAssignment.isPending ? "Creating..." : "Assign homework"}
          </Text>
        </Pressable>
      </View>

      {isLoading && <Text>Loading assignments...</Text>}
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/assignments/submissions/${item.id}`} style={styles.row}>
            {item.title} ({item.subject}) — due{" "}
            {new Date(item.dueDate).toLocaleDateString()}
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <Text>No assignments yet.</Text> : null}
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
    fontSize: 16,
  },
});
