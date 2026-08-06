import { useMarkAttendance, useStudentsByClass } from "@skolara/api-client";
import type { AttendanceStatus } from "@skolara/types";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text } from "react-native";
import { spacing, typography, type Tone } from "@/lib/theme";
import { Button, Card, LoadingLine, Pill, Screen } from "@/lib/ui";

const CYCLE: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

const STATUS_TONE: Record<AttendanceStatus, Tone> = {
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  EXCUSED: "neutral",
};

export default function MarkAttendanceScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { data: students, isLoading } = useStudentsByClass(classId);
  const markAttendance = useMarkAttendance();
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});

  function cycleStatus(studentId: string) {
    setStatuses((prev) => {
      const current = prev[studentId] ?? "PRESENT";
      const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
      return { ...prev, [studentId]: next };
    });
  }

  async function submit() {
    if (!students) return;
    try {
      await markAttendance.mutateAsync({
        classId,
        date: new Date(),
        markedOffline: false,
        entries: students.map((s) => ({
          studentId: s.id,
          status: statuses[s.id] ?? "PRESENT",
        })),
      });
      Alert.alert("Saved", "Attendance submitted.");
    } catch {
      Alert.alert("Couldn't sync", "No connection — retry once you're back online.");
    }
  }

  return (
    <Screen>
      {isLoading && <LoadingLine label="Loading roster..." />}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.sm }}
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const status = statuses[item.id] ?? "PRESENT";
          return (
            <Pressable onPress={() => cycleStatus(item.id)}>
              <Card style={styles.row}>
                <Text style={styles.name}>
                  {item.user.firstName} {item.user.lastName}
                </Text>
                <Pill label={status} tone={STATUS_TONE[status]} />
              </Card>
            </Pressable>
          );
        }}
      />
      <Button
        title={markAttendance.isPending ? "Saving..." : "Submit attendance"}
        onPress={submit}
        loading={markAttendance.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { ...typography.body },
});
