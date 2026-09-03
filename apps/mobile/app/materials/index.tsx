import { useMyChildren, useStudentStudyMaterials } from "@skolara/api-client";
import { useMemo, useState } from "react";
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "@/lib/theme";
import { Card, Chip, EmptyState, LoadingLine, Pill, Screen } from "@/lib/ui";

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function StudyMaterialsScreen() {
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const [subject, setSubject] = useState<string>();
  const activeStudentId = studentId ?? children?.[0]?.id;

  const { data: materials, isLoading } = useStudentStudyMaterials(activeStudentId);

  // Subjects come from what's actually published, so the filter never offers
  // a tab that leads to an empty list.
  const subjects = useMemo(
    () => [...new Set((materials ?? []).map((m) => m.subject))].sort(),
    [materials],
  );
  const visible = subject ? (materials ?? []).filter((m) => m.subject === subject) : materials;

  async function open(url: string) {
    // Handing off to the browser rather than rendering in-app: a .docx has no
    // viewer here, and the browser already knows what to do with every type
    // the library accepts.
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Can't open that", "No app on this phone can open this file.");
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
              onPress={() => {
                setStudentId(child.id);
                setSubject(undefined);
              }}
            />
          ))}
        </View>
      )}

      {subjects.length > 1 && (
        <View style={styles.chipRow}>
          <Chip label="All" active={!subject} onPress={() => setSubject(undefined)} />
          {subjects.map((s) => (
            <Chip key={s} label={s} active={subject === s} onPress={() => setSubject(s)} />
          ))}
        </View>
      )}

      {isLoading && <LoadingLine label="Loading materials..." />}

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item.fileUrl)}>
            <Card>
              <View style={styles.header}>
                <Text style={styles.title}>{item.title}</Text>
                <Pill label={item.subject} tone="brand" />
              </View>
              {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
              <Text style={styles.meta}>
                {fileSize(item.sizeBytes)} · {item.uploadedByUser.firstName}{" "}
                {item.uploadedByUser.lastName} ·{" "}
                {new Date(item.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="Nothing published yet"
              description="Notes and worksheets your teachers share will appear here."
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
  meta: { ...typography.muted, marginTop: 2 },
});
