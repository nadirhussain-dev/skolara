import { useSendMessage, useThreadMessages } from "@skolara/api-client";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { getStoredAccessToken } from "@/lib/api-client";
import { decodeJwtSubject } from "@/lib/jwt";
import { colors, radius, spacing } from "@/lib/theme";
import { Button, Input, Screen } from "@/lib/ui";

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { t } = useTranslation();
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
    <Screen>
      {isLoading && <Text style={styles.loading}>{t("common.loading")}</Text>}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.xs }}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.senderId === currentUserId ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            <Text style={item.senderId === currentUserId ? styles.textMine : styles.textTheirs}>
              {item.body}
            </Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <Input
          placeholder={t("messaging.messagePlaceholder")}
          value={body}
          onChangeText={setBody}
          style={{ flex: 1 }}
        />
        <Button title={t("messaging.send")} onPress={submit} style={styles.sendButton} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { color: colors.slate[500], fontSize: 13, paddingVertical: spacing.sm },
  bubble: { maxWidth: "80%", borderRadius: radius.lg, padding: 10, marginVertical: 4 },
  bubbleMine: { backgroundColor: colors.brand[700], alignSelf: "flex-end" },
  bubbleTheirs: { backgroundColor: colors.slate[200], alignSelf: "flex-start" },
  textMine: { color: colors.white },
  textTheirs: { color: colors.slate[800] },
  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  sendButton: { paddingHorizontal: spacing.lg },
});
