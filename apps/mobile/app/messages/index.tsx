import { useMessageContacts, useStartThread, useThreads } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ChildSwitcher } from "@/components/child-switcher";
import { ChildProvider, useChild } from "@/lib/child-context";
import { timeAgo } from "@/lib/dates";
import { palette, useTheme } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { useSession } from "@/lib/session";
import { Avatar, Card, Chip, EmptyState, ErrorState, Muted, SectionLabel, Skeleton, Txt } from "@/lib/ui";

const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

/**
 * Conversations between a family and the child's teachers. Parents start
 * them; teachers answer. Nothing leaves the app — no numbers are shared.
 */
export default function MessagesScreen() {
  return (
    <ChildProvider>
      <Messages />
    </ChildProvider>
  );
}

function Messages() {
  const { t, locale } = useTranslation();
  const { brand } = useTheme();
  const me = useSession();
  const threads = useThreads();
  const isParent = me.role === "PARENT";

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={threads.isRefetching} onRefresh={() => void threads.refetch()} />}
    >
      {isParent && <NewConversation />}
      <SectionLabel>{t("everyday.conversations")}</SectionLabel>
      {threads.isError ? (
        <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void threads.refetch()} />
      ) : !threads.data ? (
        <><Skeleton /><Skeleton /></>
      ) : threads.data.length === 0 ? (
        <Card><EmptyState title={t("messaging.noConversations")} description={isParent ? t("everyday.noConversationsParent") : t("everyday.noConversationsTeacher")} /></Card>
      ) : (
        <Card style={styles.list}>
          {threads.data.map((thread, index) => {
            const other = isParent ? thread.teacherUser : thread.parentUser;
            const mine = thread.lastMessage?.senderId === me.userId;
            return (
              <Pressable
                key={thread.id}
                onPress={() => router.push(`/messages/${thread.id}`)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.thread, index > 0 && styles.divider, pressed && { backgroundColor: "#F1F5F9" }]}
              >
                <Avatar name={fullName(other)} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.threadTop}>
                    <Txt style={styles.name} numberOfLines={1}>{fullName(other)}</Txt>
                    {thread.lastMessage && <Muted style={{ fontSize: 12 }}>{timeAgo(thread.lastMessage.createdAt, locale)}</Muted>}
                  </View>
                  <Txt style={{ color: brand[700], fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                    {t("chat.about", { child: fullName(thread.student.user) })}
                  </Txt>
                  <Muted style={{ fontSize: 14 }}>
                    {thread.lastMessage ? `${mine ? t("everyday.you") : ""}${thread.lastMessage.body}` : t("chat.noMessagesYet")}
                  </Muted>
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

function NewConversation() {
  const { t } = useTranslation();
  const { child } = useChild();
  const contacts = useMessageContacts(child?.id);
  const start = useStartThread();

  async function open(teacherUserId: string) {
    if (!child) return;
    const thread = await start.mutateAsync({ studentId: child.id, teacherUserId });
    router.push(`/messages/${thread.id}`);
  }

  if (!child) return null;
  return (
    <Card>
      <Txt style={styles.name}>{t("everyday.writeToTeacher")}</Txt>
      <Muted>{t("everyday.writeToTeacherBody", { child: child.user.firstName })}</Muted>
      <ChildSwitcher />
      <View style={styles.chips}>
        {contacts.isLoading ? (
          <Muted>{t("common.loading")}</Muted>
        ) : (contacts.data ?? []).length === 0 ? (
          <Muted>{t("everyday.noTeachersYet")}</Muted>
        ) : (
          (contacts.data ?? []).map((teacher) => (
            <Chip key={teacher.id} label={fullName(teacher)} onPress={() => void open(teacher.id)} />
          ))
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  list: { padding: 0, gap: 0, overflow: "hidden" },
  thread: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 72 },
  divider: { borderTopWidth: 1, borderTopColor: palette.line },
  threadTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, justifyContent: "space-between" },
  name: { color: palette.ink, fontWeight: "800", fontSize: 16, flexShrink: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
