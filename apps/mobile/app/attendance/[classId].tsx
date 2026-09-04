import { useMarkAttendance, useStudentsByClass } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { AttendanceStatus } from "@skolara/types";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, FlatList, Pressable, StyleSheet, Text } from "react-native";
import {
  enqueueAttendance,
  flushAttendanceQueue,
  queuedCount,
} from "@/lib/offline-queue";
import { colors, spacing, typography, type Tone } from "@/lib/theme";
import { Button, Card, LoadingLine, Pill, Screen } from "@/lib/ui";

const CYCLE: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

const STATUS_TONE: Record<AttendanceStatus, Tone> = {
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  EXCUSED: "neutral",
};

/** Registers are per-day, so the time component is dropped before sending. */
function today(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function MarkAttendanceScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { data: students, isLoading } = useStudentsByClass(classId);
  const markAttendance = useMarkAttendance();
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Every state update here happens after an await, so this never sets state
  // synchronously during the effect body below.
  const flush = useCallback(async () => {
    const result = await flushAttendanceQueue();
    setPending(result.remaining);
    return result;
  }, []);

  useEffect(() => {
    // Drain on open, then again whenever the teacher comes back to the app —
    // that's usually the moment they've walked back into wifi range.
    // The lint rule can't see that `flush` only sets state after awaiting the
    // network call, so this isn't the cascading-render case it guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void flush();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void flush();
    });
    return () => subscription.remove();
  }, [flush]);

  async function syncNow() {
    setSyncing(true);
    try {
      return await flush();
    } finally {
      setSyncing(false);
    }
  }

  function cycleStatus(studentId: string) {
    setStatuses((prev) => {
      const current = prev[studentId] ?? "PRESENT";
      const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
      return { ...prev, [studentId]: next };
    });
  }

  async function submit() {
    if (!students) return;
    const entries = students.map((s) => ({
      studentId: s.id,
      status: statuses[s.id] ?? ("PRESENT" as AttendanceStatus),
    }));
    const date = today();

    try {
      await markAttendance.mutateAsync({
        classId,
        date,
        markedOffline: false,
        entries,
      });
      Alert.alert(t("common.save"), t("attendance.submitAttendance"));
    } catch {
      // Marking attendance can't depend on connectivity — a teacher standing
      // in a classroom with no signal still needs the register taken. Park it
      // and let the next successful sync push it up.
      await enqueueAttendance({ classId, date: date.toISOString(), entries });
      setPending(await queuedCount());
      Alert.alert(t("attendance.savedOffline"), t("attendance.savedOfflineBody"));
    }
  }

  return (
    <Screen>
      {isLoading && <LoadingLine label={t("gradebook.loadingRoster")} />}

      {pending > 0 && (
        <Card style={styles.pendingCard}>
          <Text style={styles.pendingText}>
            {pending === 1
              ? t("attendance.waitingToSync", { count: pending })
              : t("attendance.waitingToSyncPlural", { count: pending })}
          </Text>
          <Button
            title={syncing ? t("attendance.syncing") : t("attendance.syncNow")}
            variant="secondary"
            loading={syncing}
            onPress={async () => {
              const result = await syncNow();
              if (result.remaining > 0) {
                Alert.alert(t("attendance.savedOffline"), t("attendance.stillOffline"));
              }
            }}
          />
        </Card>
      )}

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
        title={
          markAttendance.isPending ? t("common.saving") : t("attendance.submitAttendance")
        }
        onPress={submit}
        loading={markAttendance.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { ...typography.body },
  pendingCard: { gap: spacing.sm, borderColor: colors.warning, borderWidth: 1 },
  pendingText: { ...typography.body, color: colors.slate[700] },
});
