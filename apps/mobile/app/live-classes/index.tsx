import { useMyChildren, useStudentLiveClasses } from "@skolara/api-client";
import { LIVE_CLASS_JOIN_LEAD_MINUTES } from "@skolara/types";
import { useState } from "react";
import { Alert, FlatList, Linking, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";
import { Button, Card, Chip, EmptyState, LoadingLine, Pill, Screen } from "@/lib/ui";

function when(startsAt: Date | string, endsAt: Date | string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function LiveClassesScreen() {
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const activeStudentId = studentId ?? children?.[0]?.id;

  // Polls on an interval: the join link is released by the server when the
  // window opens, so a screen left open needs to notice without a pull.
  const { data: sessions, isLoading } = useStudentLiveClasses(activeStudentId);

  async function join(url: string) {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Can't open that link", "No app on this phone can open the meeting link.");
      return;
    }
    await Linking.openURL(url);
  }

  return (
    <Screen>
      {(children?.length ?? 0) > 1 && (
        <View style={styles.chipRow}>
          {children?.map((child) => (
            <Chip
              key={child.id}
              label={child.user.firstName}
              active={activeStudentId === child.id}
              onPress={() => setStudentId(child.id)}
            />
          ))}
        </View>
      )}

      {isLoading && <LoadingLine label="Loading classes..." />}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.header}>
              <Text style={styles.title}>{item.title}</Text>
              <Pill
                label={item.joinable ? "Live" : "Upcoming"}
                tone={item.joinable ? "success" : "neutral"}
              />
            </View>
            <Text style={styles.meta}>
              {item.subject} · {item.hostUser.firstName} {item.hostUser.lastName}
            </Text>
            <Text style={styles.meta}>{when(item.startsAt, item.endsAt)}</Text>
            {item.meetingUrl ? (
              <Button title="Join now" onPress={() => join(item.meetingUrl!)} />
            ) : (
              // The link genuinely isn't here yet — the API withholds it, so
              // there is nothing a disabled button would be hiding.
              <Text style={styles.meta}>
                The link appears {LIVE_CLASS_JOIN_LEAD_MINUTES} minutes before the class starts.
              </Text>
            )}
          </Card>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No online classes scheduled"
              description="When a teacher schedules one, the link shows up here."
            />
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { ...typography.subheading, flex: 1 },
  meta: { ...typography.muted, color: colors.slate[500] },
});
