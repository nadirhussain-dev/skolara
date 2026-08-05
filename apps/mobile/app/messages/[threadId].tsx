import { useSendMessage, useThreadMessages } from "@skolara/api-client";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getStoredAccessToken } from "@/lib/api-client";
import { decodeJwtSubject } from "@/lib/jwt";

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { data: messages, isLoading } = useThreadMessages(threadId);
  const sendMessage = useSendMessage();
  const [body, setBody] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>();

  useEffect(() => {
    getStoredAccessToken().then((token) => {
      if (token) setCurrentUserId(decodeJwtSubject(token));
    });
  }, []);

  async function submit() {
    if (!body) return;
    await sendMessage.mutateAsync({ threadId, input: { body } });
    setBody("");
  }

  return (
    <View style={styles.container}>
      {isLoading && <Text>Loading messages...</Text>}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.senderId === currentUserId ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            <Text
              style={item.senderId === currentUserId ? styles.textMine : styles.textTheirs}
            >
              {item.body}
            </Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Message"
          value={body}
          onChangeText={setBody}
          style={styles.input}
        />
        <Pressable style={styles.sendButton} onPress={submit}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  bubble: { maxWidth: "80%", borderRadius: 12, padding: 10, marginVertical: 4 },
  bubbleMine: { backgroundColor: "#3730A3", alignSelf: "flex-end" },
  bubbleTheirs: { backgroundColor: "#E2E8F0", alignSelf: "flex-start" },
  textMine: { color: "#fff" },
  textTheirs: { color: "#1E293B" },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: "#3730A3",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendButtonText: { color: "#fff", fontWeight: "600" },
});
