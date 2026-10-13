import { Ionicons } from "@expo/vector-icons";
import { useMarkNotificationsRead, useNotices, useNotifications } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { InAppNotification } from "@skolara/types";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { timeAgo } from "@/lib/dates";
import { palette, useTheme } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { BrandHeader, Button, Card, Chip, EmptyState, ErrorState, Muted, Skeleton, Txt } from "@/lib/ui";

/**
 * Where a notification leads for each kind of user. Only these fixed,
 * in-app routes are ever used: nothing from the notification's payload is
 * turned into a link.
 */
export type InboxRoutes = Partial<Record<string, Href>>;

function Row({ item, onPress }: { item: InAppNotification; onPress: () => void }) {
  const { locale } = useTranslation();
  const { brand } = useTheme();
  const unread = item.readAt === null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: "#F1F5F9" }]}
    >
      <View style={[styles.dot, { backgroundColor: unread ? palette.accent : "transparent" }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ color: palette.ink, fontWeight: unread ? "800" : "600", fontSize: 16 }}>{item.title}</Txt>
        <Txt>{item.body}</Txt>
        <Muted style={{ fontSize: 12 }}>{timeAgo(item.createdAt, locale)}</Muted>
      </View>
      <Ionicons name="notifications-outline" size={18} color={brand[600]} />
    </Pressable>
  );
}

/** The Inbox tab for every role: notifications sent to this user, and the school's notices. */
export function InboxScreen({ routes, onNotices }: { routes: InboxRoutes; onNotices?: () => void }) {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<"notifications" | "notices">("notifications");
  const inbox = useNotifications({ refetchInterval: 60_000 });
  const notices = useNotices();
  const markRead = useMarkNotificationsRead();
  const active = tab === "notifications" ? inbox : notices;
  const unread = inbox.data?.unreadCount ?? 0;

  function open(item: InAppNotification) {
    if (item.readAt === null) markRead.mutate([item.id]);
    const type = item.data?.type;
    if (type === "NOTICE") {
      setTab("notices");
      onNotices?.();
      return;
    }
    const target = type ? routes[type] : undefined;
    if (target) router.push(target);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.page }} edges={["left", "right"]}>
      <BrandHeader title={t("app.tabInbox")}>
        <View style={styles.tabs}>
          <Chip label={unread > 0 ? `${t("app.notifications")} (${unread})` : t("app.notifications")} active={tab === "notifications"} onPress={() => setTab("notifications")} />
          <Chip label={t("app.notices")} active={tab === "notices"} onPress={() => setTab("notices")} />
        </View>
      </BrandHeader>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={active.isRefetching} onRefresh={() => void active.refetch()} />}
      >
        {active.isError ? (
          <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void active.refetch()} />
        ) : tab === "notifications" ? (
          !inbox.data ? (
            <><Skeleton /><Skeleton /><Skeleton /></>
          ) : inbox.data.items.length === 0 ? (
            <EmptyState title={t("app.inboxEmpty")} description={t("app.inboxEmptyBody")} />
          ) : (
            <>
              {unread > 0 && <Button title={t("app.markAllRead")} variant="ghost" onPress={() => markRead.mutate(undefined)} loading={markRead.isPending} />}
              <Card style={{ padding: 0, gap: 0 }}>
                {inbox.data.items.map((item, index) => (
                  <View key={item.id} style={index > 0 ? styles.divider : undefined}>
                    <Row item={item} onPress={() => open(item)} />
                  </View>
                ))}
              </Card>
            </>
          )
        ) : !notices.data ? (
          <><Skeleton height={96} /><Skeleton height={96} /></>
        ) : notices.data.length === 0 ? (
          <EmptyState title={t("app.noticesEmpty")} />
        ) : (
          notices.data.map((notice) => (
            <Card key={notice.id}>
              <Txt accessibilityRole="header" style={{ color: palette.ink, fontWeight: "800", fontSize: 17 }}>{notice.title}</Txt>
              <Txt style={{ lineHeight: 22 }}>{notice.body}</Txt>
              <Muted style={{ fontSize: 12 }}>{timeAgo(notice.createdAt, locale)}</Muted>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // The chips sit on the brand colour, so they get a white plate to stay readable.
  tabs: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, backgroundColor: "#FFFFFF", alignSelf: "flex-start", padding: 4, borderRadius: 999 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", gap: spacing.md, padding: spacing.lg, alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  divider: { borderTopWidth: 1, borderTopColor: palette.line },
});
