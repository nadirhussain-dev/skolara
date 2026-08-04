import { useMarkAttendance, useStudentsByClass } from "@skolara/api-client";
import type { AttendanceStatus } from "@skolara/types";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const CYCLE: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: "#059669",
  ABSENT: "#DC2626",
  LATE: "#F59E0B",
  EXCUSED: "#64748B",
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
      Alert.alert(
        "Couldn't sync",
        "No connection — retry once you're back online.",
      );
    }
  }

  return (
    <View style={styles.container}>
      {isLoading && <Text>Loading roster...</Text>}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const status = statuses[item.id] ?? "PRESENT";
          return (
            <Pressable style={styles.row} onPress={() => cycleStatus(item.id)}>
              <Text style={styles.name}>
                {item.user.firstName} {item.user.lastName}
              </Text>
              <Text style={[styles.status, { color: STATUS_COLOR[status] }]}>
                {status}
              </Text>
            </Pressable>
          );
        }}
      />
      <Pressable
        style={styles.submit}
        onPress={submit}
        disabled={markAttendance.isPending}
      >
        <Text style={styles.submitText}>
          {markAttendance.isPending ? "Saving..." : "Submit attendance"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  name: { fontSize: 16 },
  status: { fontWeight: "600" },
  submit: {
    backgroundColor: "#3730A3",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  submitText: { color: "#fff", fontWeight: "600" },
});
