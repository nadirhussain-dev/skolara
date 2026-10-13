import { useSendMessage, useThreadMessages, useThreads } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { palette, useTheme } from "@/lib/school-theme";
import { radius, spacing } from "@/lib/theme";
import { useSession } from "@/lib/session";
import { Input, Muted, Skeleton } from "@/lib/ui";

/** One conversation: bubbles, newest at the bottom, and a box to reply. */
export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { t, locale } = useTranslation();
  const { brand, isRTL } = useTheme();
  const me = useSession();
  const messages = useThreadMessages(threadId);
  const threads = useThreads();
  const send = useSendMessage();
  const [body, setBody] = useState("");
  const [failed, setFailed] = useState(false);
  const list = useRef<FlatList>(null);
  const thread = threads.data?.find((th) => th.id === threadId);
  const other = thread ? (me.role === "PARENT" ? thread.teacherUser : thread.parentUser) : null;
  const time = new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  function submit() {
    const text = body.trim();
    if (!text || !threadId) return;
    setFailed(false);
    send.mutate({ threadId, input: { body: text } }, { onSuccess: () => setBody(""), onError: () => setFailed(true) });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.page }} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: other ? `${other.firstName} ${other.lastName}` : t("screens.conversation") }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        {thread && <Muted style={styles.about}>{t("chat.about", { child: `${thread.student.user.firstName} ${thread.student.user.lastName}` })}</Muted>}
        {!messages.data ? (
          <View style={{ padding: spacing.lg, gap: spacing.sm }}><Skeleton height={48} /><Skeleton height={48} /></View>
        ) : (
          <FlatList
            ref={list}
            data={messages.data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<Muted style={{ textAlign: "center", marginTop: spacing.xl }}>{t("chat.startHint")}</Muted>}
            renderItem={({ item }) => {
              const mine = item.senderId === me.userId;
              return (
                <View style={[styles.bubble, mine ? { alignSelf: "flex-end", backgroundColor: brand[700], borderBottomRightRadius: 4 } : { alignSelf: "flex-start", backgroundColor: palette.surface, borderBottomLeftRadius: 4 }]}>
                  <Text style={{ color: mine ? "#FFFFFF" : palette.ink, fontSize: 15, lineHeight: 21, textAlign: isRTL ? "right" : "left" }}>{item.body}</Text>
                  <Text style={{ color: mine ? "rgba(255,255,255,0.8)" : palette.muted, fontSize: 11, marginTop: 4 }}>{time.format(new Date(item.createdAt))}</Text>
                </View>
              );
            }}
          />
        )}
        {failed && <Text accessibilityLiveRegion="polite" style={styles.failed}>{t("everyday.notSent")}</Text>}
        <View style={styles.composer}>
          <Input
            value={body}
            onChangeText={setBody}
            placeholder={t("chat.placeholder")}
            accessibilityLabel={t("chat.writeLabel")}
            multiline
            maxLength={4000}
            style={styles.input}
          />
          <Pressable
            onPress={submit}
            disabled={!body.trim() || send.isPending}
            accessibilityRole="button"
            accessibilityLabel={t("chat.send")}
            style={[styles.send, { backgroundColor: brand[700], opacity: !body.trim() || send.isPending ? 0.5 : 1 }]}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  about: { textAlign: "center", paddingTop: spacing.sm },
  messages: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  bubble: { maxWidth: "82%", borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: palette.line, backgroundColor: palette.surface },
  input: { flex: 1, minHeight: 44, maxHeight: 120 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  failed: { color: palette.danger, fontWeight: "700", paddingHorizontal: spacing.lg },
});
